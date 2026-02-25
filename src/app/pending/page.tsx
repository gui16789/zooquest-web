import { redirect } from "next/navigation";

import { PendingView } from "@/components/pending/PendingView";
import { LEVELS } from "@/domain/levels/levels";
import { scoreToStars } from "@/domain/scoring/stars";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";

type ProgressRow = {
  level_id: string;
  best_score: number;
  attempts: number;
  fails: number;
  updated_at: string;
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

export default async function PendingPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/");

  const supabase = getSupabaseAdmin();

  const [progressRes, growthRes, kpRes] = await Promise.all([
    supabase
      .from("level_progress")
      .select("level_id, best_score, attempts, fails, updated_at")
      .eq("kid_user_id", user.kidUserId)
      .order("updated_at", { ascending: false }),
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
      .limit(6),
  ]);

  if (progressRes.error) {
    throw new Error(`PENDING_PROGRESS_ERROR:${progressRes.error.message}`);
  }

  const progress: ProgressRow[] = (progressRes.data ?? []).map((r) => ({
    level_id: (r.level_id as string) ?? "",
    best_score: (r.best_score as number) ?? 0,
    attempts: (r.attempts as number) ?? 0,
    fails: (r.fails as number) ?? 0,
    updated_at: (r.updated_at as string) ?? "",
  }));

  const regularProgress = progress.filter((p) => /^u[1-8]$/.test(p.level_id));
  const solvedCount = regularProgress.filter((p) => scoreToStars(p.best_score) >= 2).length;

  const pendingCases = regularProgress
    .filter((p) => p.attempts > 0 && (p.fails > 0 || scoreToStars(p.best_score) < 2))
    .map((p) => {
      const level = LEVELS.find((item) => item.unitId === p.level_id);
      const stars = scoreToStars(p.best_score);
      return {
        id: p.level_id,
        levelId: p.level_id,
        title: `案件 ${p.level_id.toUpperCase()} · ${level?.regionName ?? p.level_id}`,
        subtitle: level?.theme ?? "复习任务",
        fileCode: `FILE-${p.level_id.toUpperCase()}`,
        suspect: level?.bossCharacters[0] ?? "未知嫌疑人",
        detail: `当前星级 ${stars}，需要至少 2 星通关`,
        attempts: p.attempts,
        fails: p.fails,
        bestScore: p.best_score,
        stars,
        priority: p.fails >= 3 || stars === 0 ? "high" : "normal",
        actionHref: `/play/${p.level_id}`,
        actionLabel: p.attempts > 1 ? "继续侦破" : "开始侦破",
      } as const;
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === "high" ? -1 : 1;
      }
      if (a.fails !== b.fails) {
        return b.fails - a.fails;
      }
      return a.stars - b.stars;
    });

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
    <PendingView
      nickname={user.nickname}
      growth={growth}
      solvedCount={solvedCount}
      pendingCases={pendingCases}
      weaknesses={weaknesses}
    />
  );
}
