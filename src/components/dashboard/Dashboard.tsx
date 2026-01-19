"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getBadgeMeta } from "@/domain/badges/catalog";
import { LEVELS } from "@/domain/levels/levels";
import { computeLevelState } from "@/domain/levels/state";

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

// 8 Zones Configuration as per approved design
const ZOO_ZONES: Record<string, { name: string; char: string; color: string; pos: string }> = {
  u1: { name: "哺乳动物大都会", char: "轰鸣警官", color: "bg-blue-600", pos: "left-[50%] top-[5%]" },
  u2: { name: "撒哈拉广场", char: "豹警官", color: "bg-orange-500", pos: "left-[80%] top-[18%]" },
  u3: { name: "结冰镇", char: "水牛局长", color: "bg-cyan-600", pos: "left-[30%] top-[30%]" },
  u4: { name: "小型啮齿动物城", char: "闪电", color: "bg-emerald-600", pos: "left-[70%] top-[42%]" },
  u5: { name: "雨林区", char: "本杰明市长", color: "bg-green-700", pos: "left-[20%] top-[55%]" },
  u6: { name: "运河区", char: "贝拉羊副市长", color: "bg-indigo-600", pos: "left-[60%] top-[68%]" },
  u7: { name: "神秘泉", char: "费尼克", color: "bg-purple-600", pos: "left-[80%] top-[80%]" },
  u8: { name: "兔窝镇", char: "冰小姐", color: "bg-pink-500", pos: "left-[40%] top-[92%]" },
};

// Inline SVG Avatars (Simple Shapes)
const CharAvatar = ({ char }: { char: string }) => {
  switch (char) {
    case "轰鸣警官": // Lion-ish
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2L14 7H10L12 2Z" fill="white" /> {/* Mane spike */}
          <circle cx="9" cy="11" r="1" fill="white" />
          <circle cx="15" cy="11" r="1" fill="white" />
          <path d="M10 16 Q12 18 14 16" stroke="white" strokeWidth="2" fill="none" />
        </svg>
      );
    case "豹警官": // Round ears
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
          <circle cx="12" cy="12" r="10" />
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="9" cy="12" r="1" fill="white" />
          <circle cx="15" cy="12" r="1" fill="white" />
          <ellipse cx="12" cy="16" rx="2" ry="1" fill="white" />
        </svg>
      );
    case "水牛局长": // Horns
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
           <path d="M2 6 Q6 12 10 10 L14 10 Q18 12 22 6" stroke="white" strokeWidth="3" fill="none" />
           <rect x="6" y="8" width="12" height="12" rx="4" />
           <circle cx="10" cy="13" r="1.5" fill="white" />
           <circle cx="14" cy="13" r="1.5" fill="white" />
        </svg>
      );
    case "闪电": // Sloth (Droopy eyes)
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
           <circle cx="12" cy="12" r="10" />
           <path d="M7 12 Q9 10 11 12" stroke="white" strokeWidth="2" fill="none" />
           <path d="M13 12 Q15 10 17 12" stroke="white" strokeWidth="2" fill="none" />
           <path d="M10 17 Q12 18 14 17" stroke="white" strokeWidth="2" fill="none" />
        </svg>
      );
    case "本杰明市长": // Suit/Tie
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
           <rect x="4" y="4" width="16" height="16" rx="2" />
           <path d="M12 20 L12 12" stroke="white" strokeWidth="2" />
           <path d="M8 12 L12 16 L16 12" stroke="white" strokeWidth="2" fill="none" />
        </svg>
      );
    case "贝拉羊副市长": // Wool/Glasses
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
           <circle cx="12" cy="12" r="9" />
           <circle cx="8" cy="11" r="3" stroke="white" strokeWidth="1.5" fill="none" />
           <circle cx="16" cy="11" r="3" stroke="white" strokeWidth="1.5" fill="none" />
           <path d="M12 11 L12 13" stroke="white" strokeWidth="1.5" />
        </svg>
      );
    case "费尼克": // Big ears small face
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
           <path d="M4 2 L8 12 L12 14 L16 12 L20 2" fill="white" opacity="0.5" />
           <circle cx="12" cy="16" r="6" />
           <circle cx="10" cy="16" r="1" fill="white" />
           <circle cx="14" cy="16" r="1" fill="white" />
        </svg>
      );
    case "冰小姐": // Elegant
      return (
        <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
           <circle cx="12" cy="10" r="6" />
           <path d="M6 22 L18 22 L12 10 Z" opacity="0.5" />
           <circle cx="12" cy="8" r="1" fill="white" />
        </svg>
      );
    default:
      return <div className="h-full w-full rounded-full bg-gray-300" />;
  }
};


export function Dashboard(props: { nickname: string; onLogout: () => void }) {
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/progress", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setProgress(json.data.progress);
        setBadges(json.data.badges);
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
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-blue-50/50 shadow-inner ring-4 ring-white">
        {/* Winding Path SVG Background */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
           <path
             d="M50 5 C 50 10, 80 10, 80 20 C 80 30, 30 25, 30 35 C 30 45, 70 40, 70 50 C 70 60, 20 55, 20 65 C 20 75, 60 70, 60 80 C 60 90, 80 85, 80 90 C 80 95, 40 90, 40 95"
             fill="none"
             stroke="#93c5fd"
             strokeWidth="2"
             strokeDasharray="4 4"
           />
        </svg>

        {/* Nodes Layer - Using specific aspect ratio container to keep map scalable */}
        <div className="relative pb-[160%] sm:pb-[140%]"> 
          {LEVELS.map((level) => {
            const state = levelStates.get(level.unitId)!;
            const zone = ZOO_ZONES[level.unitId] || { name: level.regionName, char: "Unknown", color: "bg-gray-500", pos: "left-1/2 top-1/2" };
            
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
                      <div className="h-10 w-10">
                        <CharAvatar char={zone.char} />
                      </div>
                      {totalStars > 0 && (
                        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-yellow-900 shadow-sm">
                          {totalStars}
                        </div>
                      )}
                   </div>

                   {/* Card Info */}
                   <div className="flex w-full flex-col items-center rounded-xl bg-white p-2 text-center shadow-md ring-1 ring-black/5 transition-all hover:ring-blue-400">
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
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-4 flex items-center gap-2 border-b border-zinc-100 pb-2">
          <span className="text-lg font-bold text-zinc-900">警员荣誉墙 (MVP)</span>
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            {badges.length} 枚
          </span>
        </div>
        
        {loading ? (
          <div className="py-8 text-center text-sm text-zinc-500">加载档案中...</div>
        ) : badges.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            还没有获得荣誉勋章，快去挑战关卡吧！
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {badges.map((b) => {
              const meta = getBadgeMeta(b.badge_id);
              return (
                <div key={b.badge_id} className="group relative flex flex-col items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 transition-all hover:bg-white hover:shadow-md">
                  <div className="relative h-12 w-12 transition-transform group-hover:scale-110">
                    <img
                      src={meta.assetPath}
                      alt={meta.name}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = meta.fallbackAssetPath;
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-zinc-900">{meta.name}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-400">
                      {new Date(b.awarded_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

