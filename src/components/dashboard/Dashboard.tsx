"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

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

  const units = ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"];

  const progressByLevel = new Map(progress.map((p) => [p.level_id, p]));

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-600">你好，{props.nickname}</div>
          <div className="text-xl font-semibold">关卡地图</div>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {units.map((unitId, idx) => {
          const p = progressByLevel.get(unitId);
          return (
            <Link
              key={unitId}
              href={`/play/${unitId}`}
              className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400"
            >
              <div className="text-sm font-medium">第 {idx + 1} 关</div>
              <div className="text-xs text-zinc-600">{unitId.toUpperCase()}</div>
              <div className="mt-3 text-xs text-zinc-600">
                {p ? (
                  <div className="space-y-1">
                    <div>最佳：{p.best_score}</div>
                    <div>次数：{p.attempts}（失败 {p.fails}）</div>
                  </div>
                ) : (
                  <div>尚未挑战</div>
                )}
              </div>
            </Link>
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
