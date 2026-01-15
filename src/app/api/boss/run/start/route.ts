import crypto from "node:crypto";

import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { getContent } from "@/infra/content/localContent";
import { generateBossRun } from "@/domain/boss/generate";

const bodySchema = z.object({
  unitId: z.string().regex(/^u[1-8]$/),
});

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return jsonError("UNAUTHORIZED", 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("INVALID_INPUT", 400);

  const unitId = parsed.data.unitId;
  const runId = crypto.randomUUID();
  const seed = crypto.randomInt(1, 2 ** 31 - 1);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("quiz_runs").insert({
    id: runId,
    kid_user_id: user.kidUserId,
    unit_id: `${unitId}_boss`,
    seed,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  if (error) return jsonError(`DB_ERROR:${error.message}`, 500);

  const run = generateBossRun(getContent(), {
    unitId,
    seed,
    runId,
    questionCount: 6,
  });

  return jsonOk({
    runId: run.runId,
    unitId: run.unitId,
    seed: run.seed,
    questions: run.questions.map((q) => ({
      questionId: q.questionId,
      type: q.type,
      prompt: q.prompt,
      choices: q.choices,
      meta: q.meta,
    })),
  });
}
