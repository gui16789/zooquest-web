import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { getContent } from "@/infra/content/localContent";
import { generateRun } from "@/domain/questions/generate";
import { gradeRun } from "@/domain/questions/grade";
import { computeBadgeAwards } from "@/domain/badges/rules";
import { isUnitId } from "@/domain/badges/types";
import { scoreToStars } from "@/domain/scoring/stars";

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

  const unitIdRaw = runRow.unit_id as string;
  if (!isUnitId(unitIdRaw)) return jsonError("INVALID_UNIT", 400);

  const unitId = unitIdRaw;
  const seed = runRow.seed as number;

  const run = generateRun(getContent(), {
    unitId,
    seed,
    runId: parsed.data.runId,
    questionCount: 10,
    choiceCount: 4,
  });

  const result = gradeRun(run.questions, parsed.data.answers);
  const stars = scoreToStars(result.score);
  const passed = stars >= 2;

  // Update aggregated level progress
  const { data: existingProgress, error: progressSelectError } = await supabase
    .from("level_progress")
    .select("best_score, attempts, fails")
    .eq("kid_user_id", user.kidUserId)
    .eq("level_id", unitId)
    .maybeSingle();

  if (progressSelectError) return jsonError(`DB_ERROR:${progressSelectError.message}`, 500);

  const nextAttempts = (existingProgress?.attempts as number | undefined ?? 0) + 1;
  const nextFails = (existingProgress?.fails as number | undefined ?? 0) + (stars >= 2 ? 0 : 1);
  const nextBestScore = Math.max(
    existingProgress?.best_score as number | undefined ?? 0,
    result.score,
  );

  const { error: progressUpsertError } = await supabase.from("level_progress").upsert({
    kid_user_id: user.kidUserId,
    level_id: unitId,
    best_score: nextBestScore,
    attempts: nextAttempts,
    fails: nextFails,
    updated_at: new Date().toISOString(),
  });

  if (progressUpsertError) return jsonError(`DB_ERROR:${progressUpsertError.message}`, 500);

  // Calculate total fails across all units
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
    mode: "regular",
    stars,
    totalFailsAllUnits,
  });

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

    await supabase.from("quiz_runs").delete().eq("id", parsed.data.runId);

    return jsonOk({
      unitId,
      passed,
      stars,
      score: result.score,
      correct: result.correct,
      total: result.total,
      newBadges: (inserted ?? []).map((x) => x.badge_id as string),
    });
  }

  await supabase.from("quiz_runs").delete().eq("id", parsed.data.runId);

  return jsonOk({
    unitId,
    passed,
    stars,
    score: result.score,
    correct: result.correct,
    total: result.total,
    newBadges: [],
  });
}
