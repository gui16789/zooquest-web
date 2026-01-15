"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

type Candidate = { userId: string; avatarId: number; createdAt: string };

const AVATARS: Array<{ id: number; label: string }> = [
  { id: 1, label: "朱迪" },
  { id: 2, label: "尼克" },
  { id: 3, label: "树懒" },
  { id: 4, label: "豹警官" },
  { id: 5, label: "小羊" },
];

export function AuthPanel(props: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [nickname, setNickname] = useState("");
  const [pin4, setPin4] = useState("");
  const [avatarId, setAvatarId] = useState<number>(1);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const avatarLabel = useMemo(
    () => AVATARS.find((a) => a.id === avatarId)?.label ?? `Avatar ${avatarId}`,
    [avatarId],
  );

  async function prelogin() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/prelogin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "PRELOGIN_FAILED");
      setCandidates(json.data.candidates as Candidate[]);
      if ((json.data.candidates as Candidate[]).length === 1) {
        setAvatarId((json.data.candidates as Candidate[])[0]!.avatarId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "PRELOGIN_FAILED");
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname, pin4, avatarId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "REGISTER_FAILED");
      props.onAuthed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "REGISTER_FAILED");
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname, pin4, avatarId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "LOGIN_FAILED");
      props.onAuthed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "LOGIN_FAILED");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-4 rounded-lg border border-zinc-200 bg-white p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">ZooQuest 期末闯关</h1>
        <p className="text-sm text-zinc-600">建议使用昵称，不要用真实姓名。</p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "register" ? "primary" : "ghost"}
          onClick={() => {
            setMode("register");
            setCandidates([]);
          }}
        >
          创建角色
        </Button>
        <Button
          type="button"
          variant={mode === "login" ? "primary" : "ghost"}
          onClick={() => {
            setMode("login");
            setCandidates([]);
          }}
        >
          继续闯关
        </Button>
      </div>

      <label className="block space-y-1 text-sm">
        <div className="font-medium">昵称</div>
        <input
          className="w-full rounded-md border border-zinc-200 px-3 py-2"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="比如：小兔子"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <div className="font-medium">闯关口令（4位数字）</div>
        <input
          className="w-full rounded-md border border-zinc-200 px-3 py-2"
          value={pin4}
          onChange={(e) => setPin4(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="例如：1234"
        />
      </label>

      {mode === "login" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">选择你的头像</div>
            <Button type="button" variant="ghost" onClick={prelogin} disabled={!nickname || loading}>
              查找
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`rounded-md border px-2 py-2 text-xs ${
                  avatarId === a.id ? "border-black" : "border-zinc-200"
                }`}
                onClick={() => setAvatarId(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
          {candidates.length > 0 && (
            <div className="text-xs text-zinc-600">
              找到 {candidates.length} 个同昵称角色。当前选择：{avatarLabel}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm font-medium">头像</div>
          <select
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
            value={avatarId}
            onChange={(e) => setAvatarId(Number(e.target.value))}
          >
            {AVATARS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-600">7天自动登录；换电脑可继续。</div>
        <Button
          type="button"
          onClick={() => {
            if (mode === "register") void register();
            else void login();
          }}
          disabled={loading || !nickname || pin4.length !== 4}
        >
          {mode === "register" ? "开始" : "登录"}
        </Button>
      </div>

      {mode === "login" && (
        <div className="text-xs text-zinc-600">
          忘记口令？可以创建新角色继续闯关（旧进度找不回）。
        </div>
      )}
    </div>
  );
}
