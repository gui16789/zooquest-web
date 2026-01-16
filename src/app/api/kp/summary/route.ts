import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";

const querySchema = z.object({
  unitId: z.string().regex(/^u[1-8]$/),
});

export async function GET(req: Request) {
  const user = await getAuthedUser();
  if (!user) return jsonError("UNAUTHORIZED", 401);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ unitId: url.searchParams.get("unitId") ?? "" });
  if (!parsed.success) return jsonError("INVALID_INPUT", 400);

  const supabase = getSupabaseAdmin();

  const { data: stats, error } = await supabase
    .from("kp_stats")
    .select("kp_id, seen_count, correct_count, wrong_count, mastery_score, last_seen_at")
    .eq("kid_user_id", user.kidUserId)
    .eq("unit_id", parsed.data.unitId);

  if (error) return jsonError(`DB_ERROR:${error.message}`, 500);

  const rows = (stats ?? []).map((r) => ({
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

  return jsonOk({
    unitId: parsed.data.unitId,
    coverageRate,
    kpTotal: total,
    kpCovered: covered,
    wrongKps,
    stats: rows,
  });
}
