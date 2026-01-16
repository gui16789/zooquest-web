import { jsonError, jsonOk } from "@/lib/api";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { getAuthedUser } from "@/infra/auth/session";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return jsonError("UNAUTHORIZED", 401);

  const supabase = getSupabaseAdmin();

  const [
    { data: progress, error: progressError },
    { data: badges, error: badgeError },
    { data: growth, error: growthError },
  ] = await Promise.all([
    supabase
      .from("level_progress")
      .select("level_id, best_score, attempts, fails, updated_at")
      .eq("kid_user_id", user.kidUserId)
      .order("level_id", { ascending: true }),
    supabase
      .from("badge_awards")
      .select("badge_id, awarded_at, reason_event")
      .eq("kid_user_id", user.kidUserId)
      .order("awarded_at", { ascending: false }),
    // growth is best-effort (table may not exist yet in DB)
    supabase
      .from("kid_growth")
      .select("xp, level, title, updated_at")
      .eq("kid_user_id", user.kidUserId)
      .maybeSingle(),
  ]);

  if (progressError) return jsonError(`DB_ERROR:${progressError.message}`, 500);
  if (badgeError) return jsonError(`DB_ERROR:${badgeError.message}`, 500);

  const growthData = growthError
    ? null
    : growth
        ? {
            xp: (growth.xp as number) ?? 0,
            level: (growth.level as number) ?? 1,
            title: (growth.title as string) ?? "新手探员",
            updatedAt: (growth.updated_at as string) ?? null,
          }
        : null;

  return jsonOk({ user, progress: progress ?? [], badges: badges ?? [], growth: growthData });
}
