import Link from "next/link";

type GrowthData = {
  xp: number;
  level: number;
  title: string;
};

type PendingCase = {
  id: string;
  levelId: string;
  title: string;
  subtitle: string;
  fileCode: string;
  suspect: string;
  detail: string;
  attempts: number;
  fails: number;
  bestScore: number;
  stars: number;
  priority: "high" | "normal";
  actionHref: string;
  actionLabel: string;
};

type Weakness = {
  kpId: string;
  wrong: number;
  mastery: number;
};

export function PendingView(props: {
  nickname: string;
  growth: GrowthData | null;
  solvedCount: number;
  pendingCases: PendingCase[];
  weaknesses: Weakness[];
}) {
  const totalCases = 8;
  const pendingCount = props.pendingCases.length;
  const progressPercent = Math.round((props.solvedCount / totalCases) * 100);
  const primaryCase = props.pendingCases[0] ?? null;

  return (
    <div className="min-h-screen bg-[#101622] pb-10 text-slate-200">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#232f48] bg-[#111722]/95 px-4 py-3 shadow-lg backdrop-blur-md sm:px-10">
        <div className="flex items-center gap-4 text-white">
          <div className="flex size-10 items-center justify-center rounded-full border border-blue-600/30 bg-blue-600/20 text-blue-500">
            <span className="material-symbols-outlined">local_police</span>
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">ZPD 案件中心</h2>
            <p className="text-xs uppercase tracking-widest text-slate-400">Pending Cases Console</p>
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
            href="/report"
            className="inline-flex items-center gap-1 rounded-lg border border-[#2f3e5f] px-3 py-2 text-sm text-slate-300 hover:bg-[#1a2332]"
          >
            <span className="material-symbols-outlined text-[18px]">assessment</span>
            报告
          </Link>
          <Link
            href="/handbook"
            className="inline-flex items-center gap-1 rounded-lg border border-[#2f3e5f] px-3 py-2 text-sm text-slate-300 hover:bg-[#1a2332]"
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            手册
          </Link>
          <Link
            href="/medals"
            className="inline-flex items-center gap-1 rounded-lg border border-[#2f3e5f] px-3 py-2 text-sm text-slate-300 hover:bg-[#1a2332]"
          >
            <span className="material-symbols-outlined text-[18px]">military_tech</span>
            勋章
          </Link>
          <Link
            href="/pending"
            className="inline-flex items-center gap-1 rounded-lg border border-blue-500/60 bg-blue-600/20 px-3 py-2 text-sm font-semibold text-blue-200"
          >
            <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            待办
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-[980px] flex-col gap-8 px-4 py-8 sm:px-10">
        <section className="relative overflow-hidden rounded-2xl border border-[#243047] bg-[#1a2332] p-6 shadow-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_60%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded border border-yellow-500/30 bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-yellow-300">
                  DAILY TASK
                </span>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-300">
                  Clawhauser 在线
                </span>
              </div>
              <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">待破悬案档案室</h1>
              <p className="max-w-[640px] text-[#9db0d4]">
                警员 {props.nickname}（Lv.{props.growth?.level ?? 1} {props.growth?.title ?? "新手探员"}），下列案件还需复盘。
              </p>
              <div className="rounded-r-lg border-l-4 border-blue-500 bg-[#121a2a] p-3">
                <p className="italic text-slate-300">
                  &quot;甜甜圈可以等，但正义不能迟到。先把高优先级案件拿下！&quot;
                </p>
              </div>
            </div>
            <div>
              {primaryCase ? (
                <Link
                  href={primaryCase.actionHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-500"
                >
                  <span className="material-symbols-outlined text-[18px]">search</span>
                  {primaryCase.actionLabel}
                </Link>
              ) : (
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-6 py-3 font-bold text-white transition-all hover:border-slate-400 hover:bg-white/5"
                >
                  <span className="material-symbols-outlined text-[18px]">map</span>
                  前往地图继续闯关
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-wrap gap-4">
          <StatCard
            icon="task_alt"
            label="已结案"
            value={`${props.solvedCount}`}
            extra={`共 ${totalCases} 个主线案件`}
            barWidth={`${Math.min(100, Math.round((props.solvedCount / totalCases) * 100))}%`}
            barColor="bg-emerald-500"
          />
          <StatCard
            icon="pending_actions"
            label="待办案件"
            value={`${pendingCount}`}
            extra={pendingCount > 0 ? "建议先处理失败次数高的案件" : "暂无待复盘主线案件"}
            barWidth={`${Math.min(100, pendingCount * 18)}%`}
            barColor="bg-yellow-500"
          />
          <StatCard
            icon="analytics"
            label="任务进度"
            value={`${progressPercent}%`}
            extra={`XP ${props.growth?.xp ?? 0} · 等级 ${props.growth?.level ?? 1}`}
            barWidth={`${progressPercent}%`}
            barColor="bg-blue-500"
          />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
              <span className="material-symbols-outlined text-red-400">folder_open</span>
              待破悬案 (Pending Cases)
            </h2>
            <span className="text-sm text-slate-400">
              已结案 {props.solvedCount}/{totalCases}
            </span>
          </div>

          {props.pendingCases.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-emerald-300">
              当前没有待复盘主线案件，继续挑战新关卡即可保持连胜。
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {props.pendingCases.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-[#243047] bg-[#1a2332] shadow-lg transition-colors hover:border-blue-500/50"
                >
                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              item.priority === "high"
                                ? "bg-red-500/20 text-red-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            {item.priority === "high" ? "High Priority" : "Normal"}
                          </span>
                          <span className="text-xs text-slate-500">{item.fileCode}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white">{item.title}</h3>
                        <p className="text-sm text-slate-400">{item.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-[#2f3e5f] bg-[#111722] px-3 py-2 text-sm text-slate-300">
                        <span className="material-symbols-outlined text-[16px] text-yellow-400">stars</span>
                        {item.stars} 星
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-lg border border-[#27334d] bg-[#121a2a] p-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">嫌疑人</p>
                        <p className="mt-1 text-sm text-slate-200">{item.suspect}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">案情</p>
                        <p className="mt-1 text-sm text-slate-200">{item.detail}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#27334d] pt-4">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span>尝试 {item.attempts} 次</span>
                        <span>失败 {item.fails} 次</span>
                        <span>最佳分 {item.bestScore}</span>
                      </div>
                      <Link
                        href={item.actionHref}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-500"
                      >
                        <span className="material-symbols-outlined text-[18px]">search</span>
                        {item.actionLabel}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {props.weaknesses.length > 0 && (
          <section className="rounded-2xl border border-dashed border-[#31405e] bg-[#1a2332]/50 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <span className="material-symbols-outlined text-yellow-400">lightbulb</span>
              重点复盘知识点
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {props.weaknesses.map((item) => (
                <div key={item.kpId} className="rounded-lg border border-[#2a3753] bg-[#111722] p-4">
                  <p className="text-sm font-bold text-white">{item.kpId}</p>
                  <p className="mt-1 text-xs text-slate-400">错误 {item.wrong} 次</p>
                  <p className="text-xs text-slate-400">掌握度 {item.mastery}%</p>
                </div>
              ))}
            </div>
          </section>
        )}
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
