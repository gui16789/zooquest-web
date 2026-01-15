import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { getContent } from "@/infra/content/localContent";
import { generateRun } from "@/domain/questions/generate";
import { gradeRun } from "@/domain/questions/grade";
import type { Answer, Question } from "@/domain/questions/types";
import type { ContentSchemaV1, CharItem } from "@/domain/content/types";

const bodySchema = z.object({
  runId: z.string().uuid(),
  questionId: z.string().min(1),
  choice: z.string().min(1),
  payload: z.unknown().optional(),
});

function getCharItems(content: ContentSchemaV1, unitId: string): CharItem[] {
  const unit = content.units.find((u) => u.unitId === unitId);
  if (!unit) return [];

  return unit.sections.flatMap((s) => {
    if (s.type !== "char_table") return [];
    return s.items;
  });
}

function pickWords(content: ContentSchemaV1, unitId: string, hanzi: string): string[] {
  const chars = getCharItems(content, unitId);
  const item = chars.find((c) => c.hanzi === hanzi);
  return (item?.words ?? []).filter((w) => w.length > 0).slice(0, 2);
}

function buildExplanation(content: ContentSchemaV1, unitId: string, q: Question): string {
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
      return `在“${q.example}”里，“${q.hanzi}”读“${q.correctChoice}”。`;

    case "mcq_syn_ant": {
      const word = q.prompt.match(/“(.+?)”/)?.[1];
      if (q.prompt.includes("近义词") && word) return `“${word}”的近义词是“${q.correctChoice}”。`;
      if (q.prompt.includes("反义词") && word) return `“${word}”的反义词是“${q.correctChoice}”。`;
      return `正确答案是“${q.correctChoice}”。`;
    }

    case "sentence_pattern_fill": {
      const preview = q.template.replace(/\{(.*?)\}/g, (_, key) => q.correct[key] ?? "____");
      return `参考：${preview}`;
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

  if (question.type === "sentence_pattern_fill") {
    const correctPreview = question.template.replace(/\{(.*?)\}/g, (_, key) => question.correct[key] ?? "____");
    return jsonOk({
      isCorrect,
      explanation,
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
    correct: {
      kind: "mcq" as const,
      choice: question.correctChoice,
    },
  });
}
