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
import type { BossAnswer, BossPhaseId, BossQuestion } from "@/domain/boss/types";
import type { ContentSchema, Passage, Poem } from "@/domain/content/types";

function truncateText(input: string, maxLen: number): string {
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLen - 1))}…`;
}

function renderTemplate(template: string, filled: Record<string, string>): string {
  return template.replace(/\{(.*?)\}/g, (_, key) => filled[key] ?? "____");
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

function isBossQuestionCorrect(q: BossQuestion, answer: BossAnswer | undefined): boolean {
  if (!answer) return false;

  if (q.type === "boss_sentence_pattern_fill") {
    const payload = answer.payload;
    if (typeof payload !== "object" || payload === null) return false;

    const filled = payload as Record<string, unknown>;
    return Object.entries(q.correct).every(([key, value]) => filled[key] === value);
  }

  return answer.choice.length > 0 && answer.choice === q.correctChoice;
}

function buildBossExplanation(content: ContentSchema, unitId: string, q: BossQuestion): string {
  switch (q.type) {
    case "boss_poem_blank": {
      const poemId = q.meta?.poemId;
      const poemTitle = q.meta?.title;
      const poemAuthor = q.meta?.author;
      const poem = getUnitPoems(content, unitId).find((p) => {
        if (poemId) return p.poemId === poemId;
        return p.title === poemTitle && (poemAuthor == null || p.author === poemAuthor);
      });

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
      const passageId = q.meta?.passageId;
      const passageTitle = q.meta?.title;
      const passage = getUnitPassages(content, unitId).find((p) => (passageId ? p.passageId === passageId : p.title === passageTitle));
      const hint = passage ? truncateText(passage.text, 120) : null;
      const hintText = hint ? `依据：${hint}` : null;
      return [`正确答案：${q.correctChoice}`, hintText]
        .filter((x): x is string => x != null && x.trim().length > 0)
        .join("\n");
    }

    case "boss_reading_mcq": {
      const passageId = q.meta?.passageId;
      const passageTitle = q.meta?.title;
      const passage = getUnitPassages(content, unitId).find((p) => (passageId ? p.passageId === passageId : p.title === passageTitle));
      const hint = passage ? truncateText(passage.text, 120) : null;
      const hintText = hint ? `线索：${hint}` : null;
      return [`正确答案：${q.correctChoice}`, hintText]
        .filter((x): x is string => x != null && x.trim().length > 0)
        .join("\n");
    }

    case "boss_pinyin": {
      const hanzi = q.meta?.hanzi;
      const tail = hanzi ? `（“${hanzi}”）` : "";
      return `正确读音：${q.correctChoice}${tail}`;
    }

    case "boss_word_spelling": {
      const pinyin = q.meta?.pinyin ? `（${q.meta.pinyin}）` : "";
      return `正确词语：${q.correctChoice}${pinyin}`;
    }

    case "boss_polyphone": {
      const hanzi = q.meta?.hanzi;
      const example = q.meta?.example;
      if (hanzi && example) return `在“${example}”里，“${hanzi}”读“${q.correctChoice}”，注意看语境。`;
      return `正确答案：${q.correctChoice}`;
    }

    case "boss_confusing": {
      const ruleText = q.meta?.rule ? `辨析：${q.meta.rule}` : null;
      const examplesText = q.meta?.examples?.length ? `例句：${q.meta.examples.join("；")}` : null;
      return [`正确答案：${q.correctChoice}`, ruleText, examplesText]
        .filter((x): x is string => x != null && x.trim().length > 0)
        .join("\n");
    }

    case "boss_sentence_pattern_fill": {
      const correctPreview = renderTemplate(q.template, q.correct);
      return `参考：${correctPreview}`;
    }
  }
}

function answerToDisplay(q: BossQuestion, answer: BossAnswer | undefined): { yourAnswer: string; correctAnswer: string } {
  if (q.type === "boss_sentence_pattern_fill") {
    const correctPreview = renderTemplate(q.template, q.correct);

    const payload = answer?.payload;
    const filled: Record<string, string> = {};
    if (typeof payload === "object" && payload !== null) {
      for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
        if (typeof v === "string") filled[k] = v;
      }
    }

    const yourPreview = renderTemplate(q.template, filled);

    return {
      yourAnswer: yourPreview,
      correctAnswer: correctPreview,
    };
  }

  return {
    yourAnswer: answer?.choice ?? "",
    correctAnswer: q.correctChoice,
  };
}

const bodySchema = z.object({
  runId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      choice: z.string().min(1),
      payload: z.unknown().optional(),
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

  const answers = parsed.data.answers as BossAnswer[];
  const answerById = new Map(answers.map((a) => [a.questionId, a]));

  const result = gradeBossRun(run.questions, answers);
  const stars = scoreToStars(result.score);
  const passed = stars >= 2;

  const { data: existingProgress, error: progressSelectError } = await supabase
    .from("level_progress")
    .select("best_score, attempts, fails")
    .eq("kid_user_id", user.kidUserId)
    .eq("level_id", levelId)
    .maybeSingle();

  if (progressSelectError) return jsonError(`DB_ERROR:${progressSelectError.message}`, 500);

  const nextAttempts = ((existingProgress?.attempts as number | undefined) ?? 0) + 1;
  const nextFails = ((existingProgress?.fails as number | undefined) ?? 0) + (passed ? 0 : 1);
  const nextBestScore = Math.max((existingProgress?.best_score as number | undefined) ?? 0, result.score);

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

  const totalFailsAllUnits = (allProgress ?? []).reduce((sum, row) => sum + ((row.fails as number) ?? 0), 0);

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

  const review = run.questions.map((q) => {
    const answer = answerById.get(q.questionId);
    const isCorrect = isBossQuestionCorrect(q, answer);
    const explanation = buildBossExplanation(content, unitId, q);
    const display = answerToDisplay(q, answer);

    return {
      questionId: q.questionId,
      phaseId: q.phaseId,
      type: q.type,
      prompt: q.prompt,
      meta: "meta" in q ? q.meta : undefined,
      knowledgeRefs: q.knowledgeRefs,
      yourAnswer: display.yourAnswer,
      correctAnswer: display.correctAnswer,
      isCorrect,
      explanation,
    };
  });

  const phaseStats: Record<BossPhaseId, { correct: number; total: number }> = {
    minion1: { correct: 0, total: 0 },
    minion2: { correct: 0, total: 0 },
    boss: { correct: 0, total: 0 },
  };

  for (const item of review) {
    const stats = phaseStats[item.phaseId];
    stats.total += 1;
    if (item.isCorrect) stats.correct += 1;
  }

  const defeatedPhases = (Object.entries(phaseStats) as Array<[BossPhaseId, { correct: number; total: number }]>).filter(
    ([, s]) => s.total > 0 && s.correct === s.total,
  ).length;

  const runKpIds = Array.from(new Set(review.flatMap((r) => r.knowledgeRefs)));
  const wrongKpsInRun = Array.from(new Set(review.filter((r) => !r.isCorrect).flatMap((r) => r.knowledgeRefs)));

  let coverage:
    | {
        newlyCoveredKps: string[];
        newlyCoveredCount: number;
        cumulative?: {
          coverageRate: number;
          kpTotal: number;
          kpCovered: number;
          wrongKps: Array<{ kpId: string; seen: number; correct: number; wrong: number; mastery: number; lastSeenAt: string | null }>;
        };
      }
    | undefined;

  let recommendations:
    | {
        wrongKpsInRun: string[];
        cumulativeWrongKps?: Array<{ kpId: string; seen: number; correct: number; wrong: number; mastery: number; lastSeenAt: string | null }>;
      }
    | undefined;

  // KP stats aggregation (best-effort, don't break gameplay on DB errors)
  try {
    const nowIso = new Date().toISOString();

    if (runKpIds.length > 0) {
      const { data: existingStats, error: statsSelectError } = await supabase
        .from("kp_stats")
        .select("kp_id, seen_count, correct_count, wrong_count, mastery_score")
        .eq("kid_user_id", user.kidUserId)
        .eq("unit_id", unitId)
        .in("kp_id", runKpIds);

      if (!statsSelectError) {
        const existingByKp = new Map(
          (existingStats ?? []).map((r) => [r.kp_id as string, {
            seen: (r.seen_count as number) ?? 0,
            correct: (r.correct_count as number) ?? 0,
            wrong: (r.wrong_count as number) ?? 0,
            mastery: (r.mastery_score as number) ?? 0,
          }]),
        );

        const deltaByKp = new Map<string, { seen: number; correct: number; wrong: number; masteryDelta: number }>();

        for (const item of review) {
          const delta = item.isCorrect ? 20 : -25;
          for (const kpId of item.knowledgeRefs) {
            const prev = deltaByKp.get(kpId) ?? { seen: 0, correct: 0, wrong: 0, masteryDelta: 0 };
            deltaByKp.set(kpId, {
              seen: prev.seen + 1,
              correct: prev.correct + (item.isCorrect ? 1 : 0),
              wrong: prev.wrong + (item.isCorrect ? 0 : 1),
              masteryDelta: prev.masteryDelta + delta,
            });
          }
        }

        const newlyCoveredKps = Array.from(deltaByKp.entries())
          .filter(([kpId, d]) => {
            const prevSeen = existingByKp.get(kpId)?.seen ?? 0;
            return prevSeen === 0 && d.seen > 0;
          })
          .map(([kpId]) => kpId);

        const upserts = Array.from(deltaByKp.entries()).map(([kpId, d]) => {
          const existing = existingByKp.get(kpId);
          const prevSeen = existing?.seen ?? 0;
          const prevCorrect = existing?.correct ?? 0;
          const prevWrong = existing?.wrong ?? 0;
          const prevMastery = existing?.mastery ?? 0;

          const nextSeen = prevSeen + d.seen;
          const nextCorrect = prevCorrect + d.correct;
          const nextWrong = prevWrong + d.wrong;
          const nextMastery = Math.max(0, Math.min(100, prevMastery + d.masteryDelta));

          return {
            kid_user_id: user.kidUserId,
            unit_id: unitId,
            kp_id: kpId,
            seen_count: nextSeen,
            correct_count: nextCorrect,
            wrong_count: nextWrong,
            mastery_score: nextMastery,
            last_seen_at: nowIso,
            updated_at: nowIso,
          };
        });

        await supabase.from("kp_stats").upsert(upserts);

        coverage = {
          newlyCoveredKps,
          newlyCoveredCount: newlyCoveredKps.length,
        };

        recommendations = {
          wrongKpsInRun,
        };

        const { data: unitStats, error: unitStatsError } = await supabase
          .from("kp_stats")
          .select("kp_id, seen_count, correct_count, wrong_count, mastery_score, last_seen_at")
          .eq("kid_user_id", user.kidUserId)
          .eq("unit_id", unitId);

        if (!unitStatsError) {
          const rows = (unitStats ?? []).map((r) => ({
            kpId: r.kp_id as string,
            seen: (r.seen_count as number) ?? 0,
            correct: (r.correct_count as number) ?? 0,
            wrong: (r.wrong_count as number) ?? 0,
            mastery: (r.mastery_score as number) ?? 0,
            lastSeenAt: (r.last_seen_at as string | null) ?? null,
          }));

          const total = rows.length;
          const covered = rows.filter((r) => r.seen > 0).length;
          const coverageRate = total > 0 ? covered / total : 0;

          const wrongKps = rows
            .filter((r) => r.wrong > 0)
            .sort((a, b) => b.wrong - a.wrong)
            .slice(0, 20);

          if (coverage) {
            coverage.cumulative = {
              coverageRate,
              kpTotal: total,
              kpCovered: covered,
              wrongKps,
            };
          }

          if (recommendations) {
            recommendations.cumulativeWrongKps = wrongKps;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  await supabase.from("quiz_runs").delete().eq("id", parsed.data.runId);

  return jsonOk({
    unitId,
    mode: "boss",
    passed,
    stars,
    score: result.score,
    correct: result.correct,
    total: result.total,
    defeatedPhases,
    phaseStats,
    newBadges,
    review,
    coverage,
    recommendations,
  });
}
