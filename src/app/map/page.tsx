import { redirect } from "next/navigation";

import { MapView } from "@/components/map/MapView";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/");

  const supabase = getSupabaseAdmin();

  const [progressRes, badgesRes, growthRes] = await Promise.all([
    supabase
      .from("level_progress")
      .select("level_id, best_score, attempts, fails, updated_at")
      .eq("kid_user_id", user.kidUserId)
      .order("level_id", { ascending: true }),
    supabase
      .from("badge_awards")
      .select("badge_id")
      .eq("kid_user_id", user.kidUserId),
    supabase
      .from("kid_growth")
      .select("xp, level, title")
      .eq("kid_user_id", user.kidUserId)
      .maybeSingle(),
  ]);

  if (progressRes.error) throw new Error(`MAP_PROGRESS_ERROR:${progressRes.error.message}`);
  if (badgesRes.error) throw new Error(`MAP_BADGES_ERROR:${badgesRes.error.message}`);

  const progress = (progressRes.data ?? []).map((r) => ({
    level_id: (r.level_id as string) ?? "",
    best_score: (r.best_score as number) ?? 0,
    attempts: (r.attempts as number) ?? 0,
    fails: (r.fails as number) ?? 0,
    updated_at: (r.updated_at as string) ?? "",
  }));

  const growth = growthRes.error
    ? null
    : growthRes.data
      ? {
          xp: (growthRes.data.xp as number) ?? 0,
          level: (growthRes.data.level as number) ?? 1,
          title: (growthRes.data.title as string) ?? "新手探员",
        }
      : null;

  return (
    <MapView
      nickname={user.nickname}
      progress={progress}
      growth={growth}
      badgeCount={(badgesRes.data ?? []).length}
    />
  );
}
