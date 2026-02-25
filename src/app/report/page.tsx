import { redirect } from "next/navigation";

import { ReportView } from "@/components/report/ReportView";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";

type ProgressRow = {
  level_id: string;
  best_score: number;
  attempts: number;
  fails: number;
  updated_at: string;
};

type BadgeRow = {
  badge_id: string;
  awarded_at: string;
};

type GrowthData = {
  xp: number;
  level: number;
  title: string;
};

type WeaknessRow = {
  kpId: string;
  wrong: number;
  mastery: number;
};

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/");

  const supabase = getSupabaseAdmin();

  const [progressRes, badgeRes, growthRes, kpRes] = await Promise.all([
    supabase
      .from("level_progress")
      .select("level_id, best_score, attempts, fails, updated_at")
      .eq("kid_user_id", user.kidUserId)
      .order("updated_at", { ascending: false }),
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
    supabase
      .from("kp_stats")
      .select("kp_id, wrong_count, mastery_score")
      .eq("kid_user_id", user.kidUserId)
      .order("wrong_count", { ascending: false })
      .limit(10),
  ]);

  if (progressRes.error) {
    throw new Error(`REPORT_PROGRESS_ERROR:${progressRes.error.message}`);
  }
  if (badgeRes.error) {
    throw new Error(`REPORT_BADGE_ERROR:${badgeRes.error.message}`);
  }

  const progress: ProgressRow[] = (progressRes.data ?? []).map((r) => ({
    level_id: (r.level_id as string) ?? "",
    best_score: (r.best_score as number) ?? 0,
    attempts: (r.attempts as number) ?? 0,
    fails: (r.fails as number) ?? 0,
    updated_at: (r.updated_at as string) ?? "",
  }));

  const badges: BadgeRow[] = (badgeRes.data ?? []).map((r) => ({
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

  const weaknesses: WeaknessRow[] = kpRes.error
    ? []
    : (kpRes.data ?? []).map((r) => ({
        kpId: (r.kp_id as string) ?? "",
        wrong: (r.wrong_count as number) ?? 0,
        mastery: (r.mastery_score as number) ?? 0,
      }));

  return (
    <ReportView
      nickname={user.nickname}
      progress={progress}
      badges={badges}
      growth={growth}
      weaknesses={weaknesses}
    />
  );
}
