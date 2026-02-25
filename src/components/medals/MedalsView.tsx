import Link from "next/link";

import { getBadgeMeta } from "@/domain/badges/catalog";

type BadgeRow = {
  badge_id: string;
  awarded_at: string;
};

type GrowthData = {
  xp: number;
  level: number;
  title: string;
};

const ALL_BADGES = [
  "clear_u1",
  "clear_u2",
  "clear_u3",
  "clear_u4",
  "clear_u5",
  "clear_u6",
  "clear_u7",
  "clear_u8",
  "boss_u1_clear",
  "boss_u2_clear",
  "boss_u3_clear",
  "boss_u4_clear",
  "boss_u5_clear",
  "boss_u6_clear",
  "boss_u7_clear",
  "boss_u8_clear",
  "growth_lv2",
  "growth_lv3",
  "growth_lv4",
  "growth_lv5",
  "persistence_fails_5",
  "persistence_fails_10",
  "kp_coverage_60",
  "kp_coverage_85",
  "kp_coverage_100",
] as const;

export function MedalsView(props: {
  nickname: string;
  badges: BadgeRow[];
  growth: GrowthData | null;
}) {
  const ownedSet = new Set(props.badges.map((b) => b.badge_id));
  const ownedCount = ALL_BADGES.filter((id) => ownedSet.has(id)).length;
  const progress = Math.round((ownedCount / ALL_BADGES.length) * 100);

  const displayBadges = ALL_BADGES.slice(0, 12).map((id) => {
    const meta = getBadgeMeta(id);
    return {
      ...meta,
      owned: ownedSet.has(id),
    };
  });

  return (
    <div className="relative min-h-screen bg-[#f6f6f8] pb-10 text-slate-900">
      <div className="mx-auto w-full max-w-[980px] px-4 pb-5 pt-10 md:px-6">
        <div className="flex flex-col gap-4 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-3 md:justify-start">
              <span className="material-symbols-outlined text-4xl text-blue-800">local_police</span>
              <h1 className="text-4xl font-black leading-tight tracking-[-0.033em]">结案勋章墙</h1>
            </div>
            <p className="text-lg font-normal text-slate-500">
              欢迎来到 ZPD 荣誉大厅，警员 {props.nickname}！
            </p>
          </div>
          <div className="hidden md:block">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
              Lv.{props.growth?.level ?? 1} • {props.growth?.title ?? "新手探员"}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[980px] px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold leading-tight">
              <span className="material-symbols-outlined text-yellow-600">military_tech</span>
              传奇探员勋章进度
            </h2>
            <span className="text-2xl font-bold text-blue-800">{progress}%</span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-800 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>已收集 {ownedCount}/{ALL_BADGES.length} 枚勋章</span>
            <span className="flex items-center gap-1 font-medium text-blue-800">
              <span className="material-symbols-outlined text-sm">lightbulb</span>
              继续闯关可持续解锁
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[980px] px-4 py-4 md:px-6">
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {displayBadges.map((badge) => (
            <div
              key={badge.badgeId}
              className={`group relative flex flex-col items-center gap-4 rounded-xl border bg-white p-6 transition-all duration-300 hover:shadow-lg ${
                badge.owned ? "border-transparent hover:border-blue-800/20" : "border-slate-200 opacity-70"
              }`}
            >
              <div
                className={`relative h-32 w-32 overflow-hidden rounded-full ring-4 shadow-md transition-transform group-hover:scale-105 ${
                  badge.owned ? "ring-blue-100" : "ring-slate-200 grayscale"
                }`}
              >
                <img
                  src={badge.assetPath}
                  alt={badge.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = badge.fallbackAssetPath;
                  }}
                />
                {!badge.owned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="material-symbols-outlined text-3xl text-white">lock</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold">{badge.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{badge.description || "勋章档案"}</p>
                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    badge.owned ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {badge.owned ? "check_circle" : "lock"}
                  </span>
                  {badge.owned ? "已解锁" : "未解锁"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-10 flex justify-center">
          <div className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white p-8 md:w-2/3">
            <div className="mb-6 flex justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-slate-300 bg-slate-200">
                <span className="material-symbols-outlined z-10 text-5xl text-slate-500">workspace_premium</span>
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-2xl font-black uppercase tracking-widest text-slate-400">传奇探员</h3>
              <p className="font-medium text-blue-800">完成更多案件即可解锁终极荣誉</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-bold text-slate-700 transition hover:bg-white sm:w-auto"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            返回地图
          </Link>
          <Link
            href="/report"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-500 sm:w-auto"
          >
            <span className="material-symbols-outlined text-[18px]">assessment</span>
            查看报告
          </Link>
        </div>
      </div>
    </div>
  );
}
