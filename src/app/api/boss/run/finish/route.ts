import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { getContent } from "@/infra/content/localContent";
import { generateBossRun } from "@/domain/boss/generate";
import { gradeBossRun } from "@/domain/boss/grade";
import { computeBadgeAwards } from "@/domain/badges/rules";
import { isUnitId } from "@/domain/badges/types";
import { scoreToStars } from "@/domain/scoring/stars";
import type { BossMcqQuestion } from "@/domain/boss/types";
import type { ContentSchema, Passage, Poem } from "@/domain/content/types";

function truncateText(input: string, maxLen: number): string {
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLen - 1))}…`;
}

function getUnitPoems(content: ContentSchema, unitId: string): Poem[] {
  const unit = content.units.find((u) => u.unitId === unitId);
  if (!unit) return [];

  return unit.sections.flatMap((s) => {
    if (s.type !== "poem") return [];
    return s.poems;
  });
}

function getUnitPassages(content: ContentSchema, unitId: string): Passage[] {
  const unit = content.units.find((u) => u.unitId === unitId);
  if (!unit) return [];

  return unit.sections.flatMap((s) => {
    if (s.type !== "reading_comprehension") return [];
    return s.passages;
  });
}

function buildBossExplanation(content: ContentSchema, unitId: string, q: BossMcqQuestion): string {
  switch (q.type) {
    case "boss_poem_blank": {
      const poemTitle = q.meta?.title;
      const poemAuthor = q.meta?.author;
      const poem = getUnitPoems(content, unitId).find(
        (p) => p.title === poemTitle && (poemAuthor == null || p.author === poemAuthor),
      );

      const maybeMeaning = (poem as { meaning?: string } | undefined)?.meaning;
      const maybeGlossary = (poem as { glossary?: Record<string, string> } | undefined)?.glossary;

      const glossaryText = maybeGlossary
        ? `注释：${Object.entries(maybeGlossary)
            .map(([k, v]) => `${k}：${v}`)
            .join("；")}`
        : null;

      const meaningText = maybeMeaning ? `诗意：${maybeMeaning}` : null;

      return [`正确：${q.correctChoice}`, glossaryText, meaningText]
        .filter((x): x is string => x != null && x.trim().length > 0)
        .join("\n");
    }

    case "boss_reading_tf": {
      const passageTitle = q.meta?.title;
      const passage = getUnitPassages(content, unitId).find((p) => p.title === passageTitle);
      const hint = passage ? truncateText(passage.text, 120) : null;
      const hintText = hint ? `依据：${hint}` : null;
      return [`正确答案：${q.correctChoice}`, hintText]
        .filter((x): x is string => x != null && x.trim().length > 0)
        .join("\n");
    }

    case "boss_reading_mcq": {
      const passageTitle = q.meta?.title;
      const passage = getUnitPassages(content, unitId).find((p) => p.title === passageTitle);
      const hint = passage ? truncateText(passage.text, 120) : null;
      const hintText = hint ? `线索：${hint}` : null;
      return [`正确答案：${q.correctChoice}`, hintText]
        .filter((x): x is string => x != null && x.trim().length > 0)
        .join("\n");
    }
  }
}

const bodySchema = z.object({
  runId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      choice: z.string().min(1),
    }),
  ),
});

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

  const levelId = runRow.unit_id as string;
  if (!levelId.endsWith("_boss")) return jsonError("INVALID_RUN", 400);

  const unitIdRaw = levelId.replace(/_boss$/, "");
  if (!isUnitId(unitIdRaw)) return jsonError("INVALID_UNIT", 400);

  const unitId = unitIdRaw;
  const seed = runRow.seed as number;

  const content = getContent();
  const run = generateBossRun(content, {
    unitId,
    seed,
    runId: parsed.data.runId,
    questionCount: 6,
  });

  const result = gradeBossRun(run.questions, parsed.data.answers);
  const stars = scoreToStars(result.score);
  const passed = stars >= 2;

  const { data: existingProgress, error: progressSelectError } = await supabase
    .from("level_progress")
    .select("best_score, attempts, fails")
    .eq("kid_user_id", user.kidUserId)
    .eq("level_id", levelId)
    .maybeSingle();

  if (progressSelectError) return jsonError(`DB_ERROR:${progressSelectError.message}`, 500);

  const nextAttempts = (existingProgress?.attempts as number | undefined ?? 0) + 1;
  const nextFails = (existingProgress?.fails as number | undefined ?? 0) + (passed ? 0 : 1);
  const nextBestScore = Math.max(
    existingProgress?.best_score as number | undefined ?? 0,
    result.score,
  );

  const { error: progressUpsertError } = await supabase.from("level_progress").upsert({
    kid_user_id: user.kidUserId,
    level_id: levelId,
    best_score: nextBestScore,
    attempts: nextAttempts,
    fails: nextFails,
    updated_at: new Date().toISOString(),
  });

  if (progressUpsertError) return jsonError(`DB_ERROR:${progressUpsertError.message}`, 500);

  // Calculate total fails across all units (regular + boss)
  const { data: allProgress, error: allProgressError } = await supabase
    .from("level_progress")
    .select("fails")
    .eq("kid_user_id", user.kidUserId);

  if (allProgressError) return jsonError(`DB_ERROR:${allProgressError.message}`, 500);

  const totalFailsAllUnits = (allProgress ?? []).reduce(
    (sum, row) => sum + ((row.fails as number) ?? 0),
    0,
  );

  const awards = computeBadgeAwards({
    unitId,
    mode: "boss",
    stars,
    totalFailsAllUnits,
  });

  let newBadges: string[] = [];
  if (awards.length > 0) {
    const { data: inserted, error: badgeError } = await supabase
      .from("badge_awards")
      .upsert(
        awards.map((a) => ({
          kid_user_id: user.kidUserId,
          badge_id: a.badgeId,
          reason_event: a.reasonEvent,
        })),
        { onConflict: "kid_user_id,badge_id" },
      )
      .select("badge_id");

    if (badgeError) return jsonError(`DB_ERROR:${badgeError.message}`, 500);
    newBadges = (inserted ?? []).map((x) => x.badge_id as string);
  }

  const answerById = new Map(parsed.data.answers.map((a) => [a.questionId, a.choice]));

  const review = run.questions.map((q) => {
    const yourAnswer = answerById.get(q.questionId) ?? "";
    const isCorrect = yourAnswer.length > 0 && yourAnswer === q.correctChoice;
    const explanation = buildBossExplanation(content, unitId, q);

    return {
      questionId: q.questionId,
      prompt: q.prompt,
      meta: q.meta,
      yourAnswer,
      correctAnswer: q.correctChoice,
      isCorrect,
      explanation,
    };
  });

  await supabase.from("quiz_runs").delete().eq("id", parsed.data.runId);

  return jsonOk({
    unitId,
    mode: "boss",
    passed,
    stars,
    score: result.score,
    correct: result.correct,
    total: result.total,
    newBadges,
    review,
  });
}
