import Link from "next/link";

import type { LevelId } from "@/domain/levels/levels";
import { LEVELS } from "@/domain/levels/levels";
import { computeLevelState, type ProgressRow } from "@/domain/levels/state";

type GrowthData = {
  xp: number;
  level: number;
  title: string;
};

const ZONE_STYLE: Record<
  LevelId,
  { name: string; image: string; stateIcon: string }
> = {
  u1: { name: "哺乳动物大都会", image: "/assets/avatar-1.jpg", stateIcon: "pets" },
  u2: { name: "撒哈拉广场", image: "/assets/avatar-2.jpg", stateIcon: "forest" },
  u3: { name: "结冰镇", image: "/assets/avatar-3.jpg", stateIcon: "ac_unit" },
  u4: { name: "小型啮齿动物城", image: "/assets/avatar-4.jpg", stateIcon: "apartment" },
  u5: { name: "雨林区", image: "/assets/avatar-5.jpg", stateIcon: "rainy" },
  u6: { name: "运河区", image: "/assets/avatar-6.jpg", stateIcon: "directions_boat" },
  u7: { name: "神秘泉", image: "/assets/avatar-7.jpg", stateIcon: "auto_awesome" },
  u8: { name: "兔窝镇", image: "/assets/avatar-8.jpg", stateIcon: "emoji_nature" },
};

export function MapView(props: {
  nickname: string;
  progress: ProgressRow[];
  growth: GrowthData | null;
  badgeCount: number;
}) {
  const states = new Map(LEVELS.map((l) => [l.unitId, computeLevelState(l.unitId, props.progress)]));

  const cards = LEVELS.map((level, idx) => {
    const state = states.get(level.unitId)!;
    const prevLevel = idx === 0 ? null : LEVELS[idx - 1]!;
    const prevState = prevLevel ? states.get(prevLevel.unitId) : null;

    const unlocked = idx === 0 || (prevState?.regular?.stars ?? 0) >= 2;
    const regularStars = state.regular?.stars ?? 0;
    const bossStars = state.boss?.stars ?? 0;
    const completed = regularStars >= 2 && bossStars >= 2;
    const inProgress = unlocked && !completed && ((state.regular?.attempts ?? 0) > 0 || (state.boss?.attempts ?? 0) > 0);
    const zone = ZONE_STYLE[level.unitId];

    return {
      level,
      zone,
      unlocked,
      completed,
      inProgress,
      regularStars,
      bossStars,
      totalStars: regularStars + bossStars,
    };
  });

  const solvedCount = cards.filter((c) => c.completed).length;
  const totalAttempts = props.progress.filter((p) => /^u[1-8]$/.test(p.level_id)).reduce((sum, p) => sum + p.attempts, 0);
  const progressPercent = Math.round((solvedCount / LEVELS.length) * 100);
  const xp = props.growth?.xp ?? 0;
  const xpToNextPercent = Math.min(100, Math.round(((xp % 120) / 120) * 100));

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-[#f6f7f8] text-[#0d141b]">
      <header className="sticky top-0 z-20 shrink-0 border-b border-[#e7edf3] bg-white px-4 py-3 md:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <span className="material-symbols-outlined text-2xl">local_police</span>
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Zootopia Detective</h2>
              <p className="text-xs uppercase tracking-wider text-slate-500">Mission Map Terminal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/report"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[18px]">assessment</span>
              报告
            </Link>
            <Link
              href="/medals"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[18px]">military_tech</span>
              勋章
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-72 shrink-0 flex-col justify-between overflow-y-auto border-r border-[#e7edf3] bg-white p-6 lg:flex">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <span className="material-symbols-outlined">shield</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-bold leading-normal">{props.nickname}</h1>
                <p className="text-xs font-bold leading-normal text-blue-600">
                  Lv.{props.growth?.level ?? 1} · {props.growth?.title ?? "新手探员"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center justify-center rounded-lg bg-blue-50 p-3 text-center">
                <span className="material-symbols-outlined mb-1 text-blue-600">star</span>
                <span className="text-xs font-medium text-slate-500">XP</span>
                <span className="text-sm font-bold text-slate-900">{xp}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg bg-amber-50 p-3 text-center">
                <span className="material-symbols-outlined mb-1 text-amber-500">military_tech</span>
                <span className="text-xs font-medium text-slate-500">Medals</span>
                <span className="text-sm font-bold text-slate-900">{props.badgeCount}</span>
              </div>
            </div>

            <div className="my-2 h-px bg-slate-100" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-3 text-blue-600">
                <span className="material-symbols-outlined">map</span>
                <p className="text-sm font-bold">Current Mission</p>
              </div>
              <Link
                href="/report"
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="material-symbols-outlined">assessment</span>
                <p className="text-sm font-medium">战斗报告</p>
              </Link>
              <Link
                href="/medals"
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="material-symbols-outlined">military_tech</span>
                <p className="text-sm font-medium">勋章墙</p>
              </Link>
            </div>
          </div>

          <div className="relative mt-4 cursor-pointer overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="absolute -right-4 -top-4 text-indigo-100">
              <span className="material-symbols-outlined text-[90px]">lightbulb</span>
            </div>
            <p className="relative z-10 mb-1 text-xs font-bold text-indigo-900">Daily Tip</p>
            <p className="relative z-10 text-sm text-indigo-700">先完成当前关卡到 2 星，再挑战 Boss，效率最高。</p>
          </div>
        </aside>

        <main className="relative flex-1 overflow-y-auto bg-[#f6f7f8] pb-10">
          <div className="mx-auto w-full max-w-5xl px-6 py-8">
            <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold text-slate-900">Detective Rank Progress</h2>
                  <p className="text-sm text-slate-500">Keep solving cases to promote!</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-600">{solvedCount}/8 已结案</span>
                  <div className="text-xs text-slate-500">总尝试 {totalAttempts} 次</div>
                </div>
              </div>
              <div className="pt-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold uppercase text-blue-600">
                    Level {props.growth?.level ?? 1}
                  </span>
                  <span className="inline-block text-xs font-semibold text-blue-600">{progressPercent}% 关卡完成</span>
                </div>
                <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100 text-xs">
                  <div className="bg-blue-600" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">XP to next rank</span>
                  <span className="font-semibold text-indigo-600">{xpToNextPercent}%</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-indigo-100">
                  <div className="bg-indigo-500" style={{ width: `${xpToNextPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="mb-8 flex items-center gap-4">
              <div className="rounded-full bg-white p-3 text-blue-600 shadow-sm">
                <span className="material-symbols-outlined">explore</span>
              </div>
              <div>
                <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 md:text-[32px]">
                  Mission Map: Select a District
                </h1>
                <p className="text-base text-slate-500">每个区域都有新任务，优先完成当前可用关卡。</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {cards.map((card) => {
                const badgeClass = card.completed
                  ? "bg-green-600 text-white"
                  : card.inProgress
                    ? "bg-blue-600 text-white"
                    : card.unlocked
                      ? "bg-amber-500 text-white"
                      : "bg-slate-700 text-slate-200";

                const badgeLabel = card.completed
                  ? "Completed"
                  : card.inProgress
                    ? "In Progress"
                    : card.unlocked
                      ? "Available"
                      : "Locked";

                return (
                  <div
                    key={card.level.unitId}
                    className={`group relative aspect-video overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
                      card.unlocked
                        ? "cursor-pointer border-slate-100 hover:border-blue-500/50 hover:shadow-lg"
                        : "border-slate-200"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-cover bg-center transition-transform duration-500 ${
                        card.unlocked ? "group-hover:scale-105" : "grayscale"
                      }`}
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.72) 100%), url("${card.zone.image}")`,
                      }}
                    />
                    {!card.unlocked && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px]">
                        <div className="flex flex-col items-center text-white">
                          <span className="material-symbols-outlined mb-2 text-4xl text-slate-300">lock</span>
                          <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Locked</span>
                          <span className="mt-1 text-xs text-slate-400">完成上一关后解锁</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6">
                      <div className="flex items-start justify-between">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm ${badgeClass}`}>
                          {card.level.unitId.toUpperCase()} · {badgeLabel}
                        </span>
                        <div className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
                          <span className="material-symbols-outlined">{card.zone.stateIcon}</span>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center gap-2 text-sm text-white/90">
                          <span className="material-symbols-outlined text-base">stars</span>
                          <span>{card.totalStars} 星</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{card.zone.name}</h3>
                        <p className="text-sm font-medium text-white/90">{card.level.theme}</p>
                        <div className="mt-4 flex gap-2">
                          {card.unlocked ? (
                            <Link
                              href={`/play/${card.level.unitId}`}
                              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition-colors hover:bg-blue-500"
                            >
                              {card.inProgress ? "Continue" : "Start"}
                            </Link>
                          ) : (
                            <span className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-slate-300">Locked</span>
                          )}
                          {card.unlocked && card.regularStars >= 2 ? (
                            <Link
                              href={`/boss/${card.level.unitId}`}
                              className="rounded-lg bg-red-100 px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-200"
                            >
                              Boss
                            </Link>
                          ) : (
                            <span className="rounded-lg bg-black/25 px-4 py-2 text-sm font-bold text-white/70">Boss🔒</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
