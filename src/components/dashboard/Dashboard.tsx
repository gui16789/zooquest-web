"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
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

function starsText(stars: number): string {
  return stars <= 0 ? "" : "⭐".repeat(stars);
}

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
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-600">你好，{props.nickname}</div>
          <div className="text-xl font-semibold">动物城 8 大区域闯关</div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => void reload()}>
            刷新
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              props.onLogout();
            }}
          >
            退出
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LEVELS.map((level) => {
          const state = levelStates.get(level.unitId)!;
          const regularStars = state.regular?.stars ?? 0;
          const bossStars = state.boss?.stars ?? 0;

          return (
            <div key={level.unitId} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {level.order}. {level.regionName}（{level.unitId.toUpperCase()}）
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">{level.theme}</div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/play/${level.unitId}`}
                    className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    普通关
                  </Link>

                  {state.bossUnlocked ? (
                    <Link
                      href={`/boss/${level.unitId}`}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                    >
                      Boss
                    </Link>
                  ) : (
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
                      Boss🔒
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-zinc-50 p-3">
                  <div className="text-xs font-medium text-zinc-700">普通关</div>
                  {state.regular ? (
                    <div className="mt-2 space-y-1 text-xs text-zinc-600">
                      <div>
                        星级：<span className="text-black">{starsText(regularStars)}</span>
                      </div>
                      <div>最佳：{state.regular.bestScore}</div>
                      <div>
                        次数：{state.regular.attempts}（失败 {state.regular.fails}）
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-zinc-600">尚未挑战</div>
                  )}
                </div>

                <div className="rounded-md bg-zinc-50 p-3">
                  <div className="text-xs font-medium text-zinc-700">Boss 关（6题）</div>
                  {state.boss ? (
                    <div className="mt-2 space-y-1 text-xs text-zinc-600">
                      <div>
                        星级：<span className="text-black">{starsText(bossStars)}</span>
                      </div>
                      <div>最佳：{state.boss.bestScore}</div>
                      <div>
                        次数：{state.boss.attempts}（失败 {state.boss.fails}）
                      </div>
                    </div>
                  ) : state.bossUnlocked ? (
                    <div className="mt-2 text-xs text-zinc-600">已解锁，去挑战吧</div>
                  ) : (
                    <div className="mt-2 text-xs text-zinc-600">普通关达到 ⭐⭐ 解锁</div>
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs text-zinc-600">
                Boss：{level.bossCharacters.join("、")}｜{level.bossTitle}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="text-lg font-semibold">勋章墙（MVP）</div>
        {loading ? (
          <div className="text-sm text-zinc-600">加载中…</div>
        ) : badges.length === 0 ? (
          <div className="text-sm text-zinc-600">还没有勋章，先去闯一关吧。</div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {badges.slice(0, 8).map((b) => (
              <div key={b.badge_id} className="rounded-md border border-zinc-200 bg-white p-3">
                <div className="text-sm font-medium">{b.badge_id}</div>
                <div className="text-xs text-zinc-600">{new Date(b.awarded_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
