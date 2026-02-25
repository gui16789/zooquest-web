import Link from "next/link";

type ClueCard = {
  id: string;
  unitId: string;
  title: string;
  subtitle: string;
  hint: string;
  found: boolean;
};

type ArchiveCard = {
  id: string;
  title: string;
  subtitle: string;
  meaning: string;
  example: string;
  learned: boolean;
  accent: "blue" | "orange" | "purple";
};

function accentClasses(accent: ArchiveCard["accent"]) {
  if (accent === "orange") {
    return {
      border: "border-l-orange-500",
      text: "text-orange-700",
      stamp: "border-orange-500 text-orange-500",
    };
  }
  if (accent === "purple") {
    return {
      border: "border-l-purple-500",
      text: "text-purple-700",
      stamp: "border-purple-500 text-purple-500",
    };
  }
  return {
    border: "border-l-blue-800",
    text: "text-blue-800",
    stamp: "border-green-500 text-green-500",
  };
}

export function HandbookView(props: {
  nickname: string;
  growthTitle: string;
  clueCards: ClueCard[];
  archiveCards: ArchiveCard[];
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f7f8] pb-10 text-[#0e121b]">
      <header className="z-10 flex items-center justify-between border-b border-[#e8ebf3] bg-white px-4 py-3 md:px-10">
        <div className="flex items-center gap-4">
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-800 text-white">
            <span className="material-symbols-outlined text-xl">local_police</span>
          </div>
          <h2 className="text-lg font-bold leading-tight">Zootopia Learning</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/map"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            地图
          </Link>
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
          <Link
            href="/pending"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            待办
          </Link>
        </div>
      </header>

      <main className="relative flex items-start justify-center p-4 md:p-8">
        <div className="absolute bottom-10 right-10 z-0 hidden h-6 w-64 rotate-[-15deg] rounded-full bg-orange-400 opacity-90 shadow-xl xl:block">
          <div className="absolute right-0 top-0 h-full w-12 rounded-r-full bg-green-500" />
        </div>
        <div className="absolute bottom-20 left-10 z-0 hidden rotate-12 text-gray-300 xl:block">
          <span className="material-symbols-outlined text-[180px] opacity-20">search</span>
        </div>

        <div className="relative z-10 flex h-full max-h-[860px] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border-4 border-[#3e2723] bg-[#fdfbf7] shadow-xl md:flex-row">
          <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 z-20 -ml-4 hidden w-8 bg-gradient-to-r from-transparent via-[#00000010] to-transparent md:block" />

          <section className="no-scrollbar flex flex-1 flex-col overflow-y-auto border-r border-[#e5e7eb] bg-[#fdfbf7] p-6 md:p-10">
            <div className="mb-8">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-black leading-tight text-[#3e2723] md:text-4xl">探员成长手册</h1>
                  <p className="text-sm font-medium uppercase tracking-wide text-blue-800">
                    Zootopia Police Department - {props.growthTitle}
                  </p>
                  <p className="text-sm text-slate-500">探员：{props.nickname}</p>
                </div>
                <div className="text-[#fbbf24]">
                  <span className="material-symbols-outlined text-5xl">verified_user</span>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <div className="mb-6 flex items-center gap-2 border-b-2 border-blue-800/20 pb-2">
                <span className="material-symbols-outlined text-blue-800">inventory_2</span>
                <h2 className="text-xl font-bold">线索搜集本 (Clues)</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {props.clueCards.map((card) => (
                  <div
                    key={card.id}
                    className={`group flex flex-col rounded-lg border bg-white p-3 shadow-sm transition-all hover:shadow-md ${
                      card.found ? "border-gray-100" : "border-gray-100 opacity-75"
                    }`}
                  >
                    <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-md bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-100">
                      <div className="absolute inset-0 flex items-center justify-center text-slate-800">
                        <div className="text-center">
                          <div className="text-4xl font-black tracking-wide">{card.title}</div>
                          <div className="mt-1 text-xs font-medium text-slate-500">{card.subtitle}</div>
                        </div>
                      </div>
                      <div
                        className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          card.found ? "bg-blue-800/90 text-white" : "bg-slate-300 text-slate-700"
                        }`}
                      >
                        {card.found ? "FOUND" : "LOCKED"}
                      </div>
                    </div>
                    <h3 className="text-sm font-bold">{card.unitId.toUpperCase()} · 证据卡</h3>
                    <p className="text-xs text-gray-500">{card.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="no-scrollbar relative flex flex-1 flex-col overflow-y-auto bg-[#fdfbf7] p-6 md:p-10">
            <div className="mb-6 flex items-center justify-between border-b-2 border-blue-800/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-800">folder_open</span>
                <h2 className="text-xl font-bold">词语档案 (Archive)</h2>
              </div>
              <div className="text-xs font-mono text-gray-400">REF: ZPD-LANG-02</div>
            </div>

            <div className="relative z-10 flex flex-col gap-4">
              {props.archiveCards.map((card) => {
                const tone = accentClasses(card.accent);
                return (
                  <article
                    key={card.id}
                    className={`relative rounded-lg border-y border-r border-gray-100 border-l-4 bg-white p-4 shadow-sm ${tone.border} ${
                      card.learned ? "" : "opacity-70"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="text-2xl font-black">{card.title}</h3>
                        <p className={`text-sm font-mono ${tone.text}`}>{card.subtitle}</p>
                      </div>
                      <button className="flex size-8 items-center justify-center rounded-full bg-blue-800/10 text-blue-800 transition-colors hover:bg-blue-800/20">
                        <span className="material-symbols-outlined text-lg">volume_up</span>
                      </button>
                    </div>
                    <div className="mb-3">
                      <p className="text-sm italic text-gray-600">{card.meaning}</p>
                    </div>
                    <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
                      <span className="font-bold text-blue-800">Ex:</span> {card.example}
                    </div>
                    <div
                      className={`pointer-events-none absolute right-12 top-2 rotate-[-12deg] rounded border-2 px-2 py-1 text-xs font-black uppercase tracking-widest opacity-80 ${
                        card.learned ? "border-green-500 text-green-500" : tone.stamp
                      }`}
                    >
                      {card.learned ? "Learned" : "Pending"}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="absolute -bottom-4 -right-4 z-20 rotate-6 transition-transform duration-300 hover:rotate-0 md:bottom-10 md:right-6">
              <div className="w-40 rotate-3 rounded-sm bg-white p-3 pb-8 shadow-md md:w-48">
                <div className="aspect-[4/5] overflow-hidden rounded-sm bg-gradient-to-br from-amber-100 via-white to-blue-100" />
                <div className="mt-3 -rotate-2 text-center text-xs font-bold text-gray-600">Detective Partners</div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-red-500 drop-shadow-md">
                  <span className="material-symbols-outlined text-3xl">push_pin</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
