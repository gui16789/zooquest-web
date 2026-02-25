import { redirect } from "next/navigation";

import { MedalsView } from "@/components/medals/MedalsView";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";

type BadgeRow = {
  badge_id: string;
  awarded_at: string;
};

type GrowthData = {
  xp: number;
  level: number;
  title: string;
};

export const dynamic = "force-dynamic";

export default async function MedalsPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/");

  const supabase = getSupabaseAdmin();

  const [badgesRes, growthRes] = await Promise.all([
    supabase
      .from("badge_awards")
      .select("badge_id, awarded_at")
      .eq("kid_user_id", user.kidUserId)
      .order("awarded_at", { ascending: false }),
    supabase
      .from("kid_growth")
      .select("xp, level, title")
      .eq("kid_user_id", user.kidUserId)
      .maybeSingle(),
  ]);

  if (badgesRes.error) {
    throw new Error(`MEDALS_BADGES_ERROR:${badgesRes.error.message}`);
  }

  const badges: BadgeRow[] = (badgesRes.data ?? []).map((r) => ({
    badge_id: (r.badge_id as string) ?? "",
    awarded_at: (r.awarded_at as string) ?? "",
  }));

  const growth: GrowthData | null = growthRes.error
    ? null
    : growthRes.data
      ? {
          xp: (growthRes.data.xp as number) ?? 0,
          level: (growthRes.data.level as number) ?? 1,
          title: (growthRes.data.title as string) ?? "新手探员",
        }
      : null;

  return <MedalsView nickname={user.nickname} badges={badges} growth={growth} />;
}
