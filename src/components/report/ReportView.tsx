import Link from "next/link";

import { LEVELS } from "@/domain/levels/levels";
import { scoreToStars } from "@/domain/scoring/stars";

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

export function ReportView(props: {
  nickname: string;
  progress: ProgressRow[];
  badges: BadgeRow[];
  growth: GrowthData | null;
  weaknesses: WeaknessRow[];
}) {
  const regularProgress = props.progress.filter((p) => /^u[1-8]$/.test(p.level_id));
  const totalAttempts = regularProgress.reduce((sum, p) => sum + p.attempts, 0);
  const totalFails = regularProgress.reduce((sum, p) => sum + p.fails, 0);
  const solvedCases = regularProgress.filter((p) => scoreToStars(p.best_score) >= 2).length;
  const avgScore =
    regularProgress.length === 0
      ? 0
      : Math.round(
          regularProgress.reduce((sum, p) => sum + p.best_score, 0) / regularProgress.length,
        );
  const accuracy = totalAttempts === 0 ? 0 : Math.round(((totalAttempts - totalFails) / totalAttempts) * 100);

  const pendingCases = regularProgress
    .filter((p) => p.attempts > 0 && (p.fails > 0 || scoreToStars(p.best_score) < 2))
    .map((p) => {
      const level = LEVELS.find((x) => x.unitId === p.level_id);
      return {
        levelId: p.level_id,
        title: level?.regionName ?? p.level_id,
        theme: level?.theme ?? "复习任务",
        suspect: level?.bossCharacters?.[0] ?? "未知嫌疑人",
        detail: `最佳分 ${p.best_score}，失败 ${p.fails} 次`,
      };
    })
    .slice(0, 4);

  const kps = props.weaknesses.slice(0, 2).map((w, i) => ({
    id: `kp-${i + 1}`,
    title: `知识点 ${w.kpId}`,
    detail: `错误 ${w.wrong} 次，掌握度 ${w.mastery}%`,
  }));

  const unresolved = pendingCases.length > 0 ? pendingCases : kps;

  const speedLabel = avgScore >= 90 ? "极快" : avgScore >= 80 ? "快速" : avgScore >= 60 ? "稳健" : "待提升";
  const missionStatus = solvedCases > 0 ? "COMPLETED" : "TRAINING";

  return (
    <div className="min-h-screen bg-[#101622] pb-8 text-slate-200">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#232f48] bg-[#111722]/95 px-4 py-3 shadow-lg backdrop-blur-md sm:px-10">
        <div className="flex items-center gap-4 text-white">
          <div className="flex size-10 items-center justify-center rounded-full border border-blue-600/30 bg-blue-600/20 text-blue-500">
            <span className="material-symbols-outlined">local_police</span>
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">ZPD 警务终端</h2>
            <p className="text-xs uppercase tracking-widest text-slate-400">Official Police Interface</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/map"
            className="inline-flex items-center gap-1 rounded-lg border border-[#2f3e5f] px-3 py-2 text-sm text-slate-300 hover:bg-[#1a2332]"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            地图
          </Link>
          <Link
            href="/medals"
            className="inline-flex items-center gap-1 rounded-lg border border-[#2f3e5f] px-3 py-2 text-sm text-slate-300 hover:bg-[#1a2332]"
          >
            <span className="material-symbols-outlined text-[18px]">military_tech</span>
            勋章
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-[980px] flex-col gap-8 px-4 py-8 sm:px-10">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="relative flex flex-col justify-center gap-4 p-2 lg:col-span-7">
            <div className="z-10 flex flex-col gap-2">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded border border-blue-500/30 bg-blue-600/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-300">
                  OFFICER
                </span>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-300">
                  {missionStatus}
                </span>
              </div>
              <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">战斗统计报告</h1>
              <p className="flex items-center gap-2 text-lg text-[#92a4c9]">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                警员 {props.nickname}，当前成长称号：{props.growth?.title ?? "新手探员"}
              </p>
            </div>

            <div className="mt-4 rounded-r-lg border-l-4 border-orange-500 bg-[#1a2332] p-4">
              <div className="flex gap-4">
                <div className="flex size-12 items-center justify-center rounded-full border border-orange-500/50 bg-orange-500/20">
                  <span className="material-symbols-outlined text-orange-400">pets</span>
                </div>
                <div>
                  <p className="mb-1 text-sm font-bold text-orange-200">Nick Wilde (尼克)</p>
                  <p className="italic text-slate-300">&quot;还不赖嘛，菜鸟！这份报告看起来很专业。&quot;</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative h-full min-h-[260px] overflow-hidden rounded-xl border border-[#232f48] bg-[linear-gradient(135deg,#1f2a44,#121a2a)] shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(59,130,246,0.2),transparent_60%)]" />
              <div className="absolute bottom-4 left-4 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-white">
                CAM-02 RECORDING
              </div>
              <div className="absolute right-4 top-4 rotate-[-12deg] rounded border-4 border-red-500 px-3 py-1 text-xl font-black tracking-widest text-red-500 opacity-70">
                SUCCESS
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap gap-4">
          <StatCard
            icon="target"
            label="准确度战力"
            value={`${accuracy}%`}
            extra={`${Math.max(0, 100 - accuracy)}% 可优化`}
            barWidth={`${accuracy}%`}
            barColor="bg-blue-500"
          />
          <StatCard
            icon="speed"
            label="搜寻速度"
            value={speedLabel}
            extra={`平均分 ${avgScore}`}
            barWidth={`${Math.max(12, avgScore)}%`}
            barColor="bg-purple-500"
          />
          <StatCard
            icon="military_tech"
            label="经验值获得"
            value={`+${props.growth?.xp ?? 0}`}
            extra={`Lv.${props.growth?.level ?? 1} • 勋章 ${props.badges.length} 枚`}
            barWidth={`${Math.min(100, ((props.growth?.xp ?? 0) % 120) / 1.2)}%`}
            barColor="bg-yellow-500"
          />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
              <span className="material-symbols-outlined text-red-400">folder_open</span>
              未解之谜 (需复习知识点)
            </h2>
            <span className="text-sm text-slate-400">已结案 {solvedCases} / 8</span>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-700 bg-[#1a2332]/50 p-6">
            {unresolved.length === 0 ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                当前没有待复盘项，保持节奏继续闯关。
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {unresolved.map((item, idx) => (
                  <div
                    key={`${item.title}-${idx}`}
                    className="rounded-r-lg border-l-4 border-yellow-500 bg-[#252f44] p-4 shadow-lg"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-white">{item.title}</p>
                        <p className="text-sm text-slate-400">{item.detail}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-500">archive</span>
                    </div>
                    {"suspect" in item ? (
                      <p className="text-xs text-yellow-300">嫌疑人：{item.suspect}</p>
                    ) : (
                      <p className="text-xs text-yellow-300">知识点复盘建议</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col items-center justify-center gap-4 pb-6 sm:flex-row">
          <Link
            href="/map"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 px-8 py-3.5 font-bold text-white transition-all hover:border-slate-400 hover:bg-white/5 sm:w-auto"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            返回地图
          </Link>
          <Link
            href="/play/u1"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-10 py-3.5 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-500 sm:w-auto"
          >
            继续下一关
            <span className="material-symbols-outlined text-[18px]">arrow_forward_ios</span>
          </Link>
        </section>
      </main>
    </div>
  );
}

function StatCard(props: {
  icon: string;
  label: string;
  value: string;
  extra: string;
  barWidth: string;
  barColor: string;
}) {
  return (
    <div className="group relative min-w-[220px] flex-1 overflow-hidden rounded-xl border border-[#232f48] bg-[#1a2332] p-6 transition-all duration-300 hover:border-blue-500/50">
      <div className="absolute right-0 top-0 p-3 opacity-20 transition-opacity group-hover:opacity-90">
        <span className="material-symbols-outlined text-4xl text-blue-400">{props.icon}</span>
      </div>
      <p className="text-sm font-medium uppercase tracking-wider text-slate-400">{props.label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-4xl font-bold text-white">{props.value}</p>
      </div>
      <p className="mt-1 text-xs text-slate-400">{props.extra}</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div className={`h-full ${props.barColor}`} style={{ width: props.barWidth }} />
      </div>
    </div>
  );
}
