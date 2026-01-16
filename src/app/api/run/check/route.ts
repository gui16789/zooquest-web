import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { getContent } from "@/infra/content/localContent";
import { generateRun } from "@/domain/questions/generate";
import { gradeRun } from "@/domain/questions/grade";
import type { Answer, Question } from "@/domain/questions/types";
import type { CharItem, ContentSchema } from "@/domain/content/types";

const bodySchema = z.object({
  runId: z.string().uuid(),
  questionId: z.string().min(1),
  choice: z.string().min(1),
  payload: z.unknown().optional(),
});

function getCharItems(content: ContentSchema, unitId: string): CharItem[] {
  const unit = content.units.find((u) => u.unitId === unitId);
  if (!unit) return [];

  return unit.sections.flatMap((s) => {
    if (s.type !== "char_table") return [];
    return s.items;
  });
}

function pickWords(content: ContentSchema, unitId: string, hanzi: string): string[] {
  const chars = getCharItems(content, unitId);
  const item = chars.find((c) => c.hanzi === hanzi);
  return (item?.words ?? []).filter((w) => w.length > 0).slice(0, 2);
}

function buildExplanation(content: ContentSchema, unitId: string, q: Question): string {
  switch (q.type) {
    case "mcq_pinyin": {
      const words = pickWords(content, unitId, q.hanzi);
      const tail = words.length > 0 ? `，组词：${words.join("、")}` : "";
      return `正确读音：${q.correctChoice}${tail}`;
    }

    case "mcq_hanzi_by_pinyin": {
      const hanzi = q.correctChoice;
      const words = pickWords(content, unitId, hanzi);
      const tail = words.length > 0 ? `，组词：${words.join("、")}` : "";
      return `正确汉字：${hanzi}（${q.pinyin}）${tail}`;
    }

    case "mcq_polyphone":
      return `在“${q.example}”里，“${q.hanzi}”读“${q.correctChoice}”，注意看词语语境。`;

    case "mcq_syn_ant": {
      const word = q.prompt.match(/“(.+?)”/)?.[1];
      if (q.prompt.includes("近义词") && word) return `“${word}”的近义词是“${q.correctChoice}”，意思相近。`;
      if (q.prompt.includes("反义词") && word) return `“${word}”的反义词是“${q.correctChoice}”，意思相反。`;
      return `正确答案是“${q.correctChoice}”。`;
    }

    case "mcq_confusing": {
      if (q.rule) return `辨析：${q.rule}`;
      return `正确答案是“${q.correctChoice}”。`;
    }

    case "mcq_word_spelling": {
      const pinyin = q.pinyin ? `（${q.pinyin}）` : "";
      return `正确词语：${q.correctChoice}${pinyin}`;
    }

    case "mcq_word_pattern_match":
      return `“${q.correctChoice}”属于“${q.patternType}”结构。`;

    case "sentence_pattern_fill": {
      const preview = q.template.replace(/\{(.*?)\}/g, (_, key) => q.correct[key] ?? "____");
      return `句型提示：照着句子结构填词。参考：${preview}`;
    }
  }
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return jsonError("UNAUTHORIZED", 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("INVALID_INPUT", 400);

  const supabase = getSupabaseAdmin();

  const { data: runRow, error: runError } = await supabase
    .from("quiz_runs")
    .select("id, unit_id, seed, expires_at")
    .eq("id", parsed.data.runId)
    .eq("kid_user_id", user.kidUserId)
    .maybeSingle();

  if (runError) return jsonError(`DB_ERROR:${runError.message}`, 500);
  if (!runRow) return jsonError("RUN_NOT_FOUND", 404);

  if (new Date(runRow.expires_at as string).getTime() <= Date.now()) {
    await supabase.from("quiz_runs").delete().eq("id", parsed.data.runId);
    return jsonError("RUN_EXPIRED", 410);
  }

  const unitId = runRow.unit_id as string;
  const seed = runRow.seed as number;

  const content = getContent();
  const run = generateRun(content, {
    unitId,
    seed,
    runId: parsed.data.runId,
    questionCount: 5,
    choiceCount: 4,
    mix: { t1: 2, t2: 2, t3: 1 },
    shuffleQuestions: false,
  });

  const question = run.questions.find((q) => q.questionId === parsed.data.questionId);
  if (!question) return jsonError("QUESTION_NOT_FOUND", 404);

  const answer: Answer = {
    questionId: parsed.data.questionId,
    choice: parsed.data.choice,
    payload: parsed.data.payload,
  };

  const graded = gradeRun([question], [answer]);
  const isCorrect = graded.details[0]?.isCorrect ?? false;
  const explanation = buildExplanation(content, unitId, question);

  const nowIso = new Date().toISOString();

  type GrowthUpdate = {
    xp: number;
    level: number;
    title: string;
    leveledUp: boolean;
    xpGained: number;
  };

  let growthUpdate: GrowthUpdate | null = null;

  function titleForLevel(lvl: number): string {
    if (lvl >= 5) return "王牌探员";
    if (lvl >= 4) return "高级探员";
    if (lvl >= 3) return "正式探员";
    if (lvl >= 2) return "见习探员";
    return "新手探员";
  }

  function levelForXp(totalXp: number): number {
    // Simple ramp: every 120 XP = +1 level
    return Math.max(1, Math.floor(totalXp / 120) + 1);
  }

  // Growth + KP event capture (best-effort, don't break gameplay on DB errors)
  try {
    const knowledgeRefs = question.knowledgeRefs;

    // Growth update
    try {
      const xpGained = isCorrect ? 8 : 2;

      const { data: existingGrowth, error: growthSelectError } = await supabase
        .from("kid_growth")
        .select("xp")
        .eq("kid_user_id", user.kidUserId)
        .maybeSingle();

      if (!growthSelectError) {
        const prevXp = (existingGrowth?.xp as number | undefined) ?? 0;
        const nextXp = prevXp + xpGained;
        const prevLevel = levelForXp(prevXp);
        const nextLevel = levelForXp(nextXp);
        const leveledUp = nextLevel > prevLevel;
        const nextTitle = titleForLevel(nextLevel);

        await supabase.from("kid_growth").upsert({
          kid_user_id: user.kidUserId,
          xp: nextXp,
          level: nextLevel,
          title: nextTitle,
          updated_at: nowIso,
        });

        growthUpdate = {
          xp: nextXp,
          level: nextLevel,
          title: nextTitle,
          leveledUp,
          xpGained,
        };
      }
    } catch {
      // ignore
    }

    const { error: eventError } = await supabase.from("kp_events").insert(
      knowledgeRefs.map((kpId) => ({
        kid_user_id: user.kidUserId,
        unit_id: unitId,
        run_id: parsed.data.runId,
        question_id: parsed.data.questionId,
        kp_id: kpId,
        is_correct: isCorrect,
        created_at: nowIso,
      })),
    );


    if (!eventError) {
      const delta = isCorrect ? 20 : -25;

      for (const kpId of knowledgeRefs) {
        const { data: existing, error: selectError } = await supabase
          .from("kp_stats")
          .select("seen_count, correct_count, wrong_count, mastery_score")
          .eq("kid_user_id", user.kidUserId)
          .eq("unit_id", unitId)
          .eq("kp_id", kpId)
          .maybeSingle();

        if (selectError) continue;

        const prevSeen = (existing?.seen_count as number | undefined) ?? 0;
        const prevCorrect = (existing?.correct_count as number | undefined) ?? 0;
        const prevWrong = (existing?.wrong_count as number | undefined) ?? 0;
        const prevMastery = (existing?.mastery_score as number | undefined) ?? 0;

        const nextSeen = prevSeen + 1;
        const nextCorrect = prevCorrect + (isCorrect ? 1 : 0);
        const nextWrong = prevWrong + (isCorrect ? 0 : 1);
        const nextMastery = Math.max(0, Math.min(100, prevMastery + delta));

        await supabase.from("kp_stats").upsert({
          kid_user_id: user.kidUserId,
          unit_id: unitId,
          kp_id: kpId,
          seen_count: nextSeen,
          correct_count: nextCorrect,
          wrong_count: nextWrong,
          mastery_score: nextMastery,
          last_seen_at: nowIso,
          updated_at: nowIso,
        });
      }
    }
  } catch {
    // ignore
  }


  if (question.type === "sentence_pattern_fill") {
    const correctPreview = question.template.replace(/\{(.*?)\}/g, (_, key) => question.correct[key] ?? "____");
    return jsonOk({
      isCorrect,
      explanation,
      knowledgeRefs: question.knowledgeRefs,
      growth: growthUpdate,
      correct: {
        kind: "sentence_pattern_fill" as const,
        payload: question.correct,
        preview: correctPreview,
      },
    });
  }

  return jsonOk({
    isCorrect,
    explanation,
    knowledgeRefs: question.knowledgeRefs,
    growth: growthUpdate,
    correct: {
      kind: "mcq" as const,
      choice: question.correctChoice,
    },
  });
}
