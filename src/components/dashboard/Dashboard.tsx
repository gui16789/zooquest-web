"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getBadgeMeta } from "@/domain/badges/catalog";
import type { LevelId } from "@/domain/levels/levels";
import { LEVELS } from "@/domain/levels/levels";
import { computeLevelState } from "@/domain/levels/state";
import { BadgeModal } from "@/components/dashboard/BadgeModal";

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
  reason_event: string;
};

type Growth = {
  xp: number;
  level: number;
  title: string;
  updatedAt: string | null;
};

type BadgeState =
  | { status: "unlocked"; earnedAt: string }
  | { status: "kp_disabled" }
  | { status: "locked"; progress: { current: number; target: number; label: string } };

// 8 Zones Configuration with Local Assets
const ZOO_ZONES: Record<string, { name: string; char: string; color: string; pos: string; img: string }> = {
  u1: { name: "哺乳动物大都会", char: "轰鸣警官", color: "bg-blue-600", pos: "left-[50%] top-[10%]", img: "/assets/avatar-1.jpg" },
  u2: { name: "撒哈拉广场", char: "豹警官", color: "bg-orange-500", pos: "left-[80%] top-[25%]", img: "/assets/avatar-2.jpg" },
  u3: { name: "结冰镇", char: "水牛局长", color: "bg-cyan-600", pos: "left-[30%] top-[35%]", img: "/assets/avatar-3.jpg" },
  u4: { name: "小型啮齿动物城", char: "闪电", color: "bg-emerald-600", pos: "left-[70%] top-[45%]", img: "/assets/avatar-4.jpg" },
  u5: { name: "雨林区", char: "本杰明市长", color: "bg-green-700", pos: "left-[20%] top-[55%]", img: "/assets/avatar-5.jpg" },
  u6: { name: "运河区", char: "贝拉羊副市长", color: "bg-indigo-600", pos: "left-[60%] top-[65%]", img: "/assets/avatar-6.jpg" },
  u7: { name: "神秘泉", char: "费尼克", color: "bg-purple-600", pos: "left-[85%] top-[75%]", img: "/assets/avatar-7.jpg" },
  u8: { name: "兔窝镇", char: "冰小姐", color: "bg-pink-500", pos: "left-[45%] top-[85%]", img: "/assets/avatar-8.jpg" },
};

// Avatar Component
const CharAvatar = ({ img, alt }: { img: string; alt: string }) => {
  return (
    <div className="h-full w-full overflow-hidden rounded-full bg-white">
      <img src={img} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
};

// v1 (25 badges): clear(8) + boss_clear(8) + growth_lv(4) + persistence(2) + kp_coverage(3)
const ALL_BADGES = [
  ...LEVELS.map((l) => `clear_${l.unitId}`),
  ...LEVELS.map((l) => `boss_${l.unitId}_clear`),
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

export function Dashboard(props: { nickname: string; onLogout: () => void }) {
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/progress", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setProgress(json.data.progress);
        setBadges(json.data.badges);
        setGrowth(json.data.growth ?? null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const levelStates = useMemo(() => {
    return new Map(LEVELS.map((l) => [l.unitId, computeLevelState(l.unitId, progress)]));
  }, [progress]);

  const getBadgeState = (badgeId: string): BadgeState => {
    const earned = badges.find((b) => b.badge_id === badgeId);
    if (earned) {
      return { status: "unlocked", earnedAt: earned.awarded_at };
    }
    
    // KP badges: show disabled (KP tables might not exist)
    if (badgeId.startsWith("kp_")) return { status: "kp_disabled" };

    // Calculate Progress for Locked
    let current = 0;
    let target = 0;
    let label = "";

    // Parse ID
    const mClear = badgeId.match(/^clear_(u[1-8])$/);
    const mBossClear = badgeId.match(/^boss_(u[1-8])_clear$/);
    
    if (mClear) {
      const s = levelStates.get(mClear[1] as LevelId)?.regular?.stars ?? 0;
      current = s;
      target = 2;
      label = "普通关需获2星";
    } else if (mBossClear) {
      const s = levelStates.get(mBossClear[1] as LevelId)?.boss?.stars ?? 0;
      current = s;
      target = 2;
      label = "Boss关需获2星";
    } else if (badgeId === "growth_lv2") {
      current = growth?.level ?? 1;
      target = 2;
      label = "成长到 Lv.2";
    } else if (badgeId === "growth_lv3") {
      current = growth?.level ?? 1;
      target = 3;
      label = "成长到 Lv.3";
    } else if (badgeId === "growth_lv4") {
      current = growth?.level ?? 1;
      target = 4;
      label = "成长到 Lv.4";
    } else if (badgeId === "growth_lv5") {
      current = growth?.level ?? 1;
      target = 5;
      label = "成长到 Lv.5";
    } else if (badgeId === "persistence_fails_5") {
      const totalFails = progress.reduce((acc, p) => acc + p.fails, 0);
      current = totalFails;
      target = 5;
      label = "累计失败次数";
    } else if (badgeId === "persistence_fails_10") {
      const totalFails = progress.reduce((acc, p) => acc + p.fails, 0);
      current = totalFails;
      target = 10;
      label = "累计失败次数";
    }

    return { status: "locked", progress: { current, target, label } };
  };

  const selectedMeta = selectedBadgeId ? getBadgeMeta(selectedBadgeId) : null;
  const selectedState = selectedBadgeId ? getBadgeState(selectedBadgeId) : null;

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-white/90 p-6 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900">动物城大冒险</span>
            <span className="text-sm font-medium text-zinc-500">警员: {props.nickname}</span>
          </div>
          <div className="text-xs text-zinc-400">完成任务，收集勋章，守护城市和平</div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/map"
            className="inline-flex items-center gap-1 rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            地图
          </Link>
          <Link
            href="/report"
            className="inline-flex items-center gap-1 rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="material-symbols-outlined text-[18px]">assessment</span>
            报告
          </Link>
          <Link
            href="/handbook"
            className="inline-flex items-center gap-1 rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            手册
          </Link>
          <Link
            href="/medals"
            className="inline-flex items-center gap-1 rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="material-symbols-outlined text-[18px]">military_tech</span>
            勋章
          </Link>
          <Link
            href="/pending"
            className="inline-flex items-center gap-1 rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            待办
          </Link>
          <Button type="button" variant="ghost" onClick={() => void reload()}>
            刷新
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              props.onLogout();
            }}
          >
            退出
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-blue-50 shadow-xl ring-4 ring-white">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="/assets/zootopia-map-16x9.jpg" 
            alt="Zootopia Map" 
            className="h-full w-full object-cover opacity-95"
          />
          <div className="pointer-events-none absolute inset-0 bg-white/5" />
        </div>

        {/* Nodes Layer - 16:9 Aspect Ratio */}
        <div className="relative pb-[56.25%]"> 
          {LEVELS.map((level) => {
            const state = levelStates.get(level.unitId)!;
            const zone = ZOO_ZONES[level.unitId] || { name: level.regionName, char: "Unknown", color: "bg-gray-500", pos: "left-1/2 top-1/2", img: "/assets/avatar-1.png" };
            
            const totalStars = (state.regular?.stars ?? 0) + (state.boss?.stars ?? 0);
            
            return (
              <div
                key={level.unitId}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${zone.pos} w-28 sm:w-48`}
                style={{ zIndex: 10 + level.order }}
              >
                <div className="group relative flex flex-col items-center">
                   {/* Avatar Bubble */}
                   <div className={`relative mb-2 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white shadow-lg transition-transform hover:scale-110 ${zone.color} text-white`}>
                      <div className="h-full w-full p-0.5">
                        <CharAvatar img={zone.img} alt={zone.char} />
                      </div>
                      {totalStars > 0 && (
                        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-yellow-900 shadow-sm">
                          {totalStars}
                        </div>
                      )}
                   </div>

                   {/* Card Info */}
                   <div className="flex w-full flex-col items-center rounded-xl bg-white/95 p-2 text-center shadow-md ring-1 ring-black/5 backdrop-blur-sm transition-all hover:ring-blue-400">
                      <div className="text-xs font-bold text-zinc-800">{zone.name}</div>
                      <div className="text-[10px] text-zinc-500">{zone.char}</div>
                      
                      <div className="mt-2 flex w-full gap-1">
                         <Link
                           href={`/play/${level.unitId}`}
                           className="flex-1 rounded bg-zinc-900 py-1 text-[10px] font-medium text-white transition-colors hover:bg-zinc-700"
                         >
                           闯关
                         </Link>
                         {state.bossUnlocked ? (
                            <Link
                              href={`/boss/${level.unitId}`}
                              className="flex-1 rounded bg-red-100 py-1 text-[10px] font-medium text-red-700 transition-colors hover:bg-red-200"
                            >
                              Boss
                            </Link>
                         ) : (
                            <div className="flex-1 rounded bg-zinc-100 py-1 text-[10px] text-zinc-400">
                              🔒
                            </div>
                         )}
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges Section */}
      <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-zinc-100">
        <div className="mb-6 flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
             </div>
             <div>
                <h2 className="text-lg font-black tracking-tight text-zinc-900">警员荣誉档案</h2>
                <p className="text-xs text-zinc-500">
                  已收集 {ALL_BADGES.filter((id) => badges.some((b) => b.badge_id === id)).length} / {ALL_BADGES.length} 枚勋章
                </p>
             </div>
          </div>
        </div>
        
        {loading ? (
          <div className="py-12 text-center text-sm font-medium text-zinc-400 animate-pulse">正在同步档案数据...</div>
        ) : (
          <div className="grid grid-cols-3 gap-4 min-[480px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
            {ALL_BADGES.map((badgeId) => {
              const meta = getBadgeMeta(badgeId);
              const state = getBadgeState(badgeId);
              const isLocked = state.status === "locked";
              const isKpDisabled = state.status === "kp_disabled";

              return (
                <button
                  key={badgeId}
                  onClick={() => setSelectedBadgeId(badgeId)}
                  className={`group relative flex flex-col items-center gap-2 rounded-2xl p-2 transition-all duration-300 hover:scale-105 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                    ${isLocked || isKpDisabled ? "opacity-70 grayscale-[0.8]" : "opacity-100 shadow-sm ring-1 ring-zinc-100"}
                  `}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                    <img
                      src={meta.assetPath}
                      alt={meta.name}
                      className={`h-full w-full object-contain transition-all duration-500 ${isLocked || isKpDisabled ? "scale-90 opacity-60" : "group-hover:scale-110 drop-shadow-md"}`}
                      onError={(e) => {
                        e.currentTarget.src = meta.fallbackAssetPath;
                      }}
                    />
                    {isLocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                         <div className="rounded-full bg-white/80 p-1.5 shadow-sm">
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                         </div>
                      </div>
                    )}
                    {isKpDisabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-100/50 backdrop-blur-[2px]">
                         <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[8px] font-bold text-white">
                           KP待开启
                         </span>
                      </div>
                    )}
                  </div>
                  <div className="w-full text-center">
                    <div className="truncate text-[10px] font-bold text-zinc-700 group-hover:text-zinc-900">
                      {meta.name.replace(/\(.*\)/, '')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedBadgeId && selectedMeta && selectedState && (
        <BadgeModal 
          isOpen={!!selectedBadgeId}
          onClose={() => setSelectedBadgeId(null)}
          meta={selectedMeta}
          isOwned={selectedState.status === "unlocked"}
          awardedAt={selectedState.status === "unlocked" ? selectedState.earnedAt : undefined}
          progress={selectedState.status === "locked" ? selectedState.progress : undefined}
          specialState={selectedState.status === "kp_disabled" ? "KP_DISABLED" : undefined}
        />
      )}
    </div>
  );
}
