"use client";

import { useState } from "react";

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
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200 lg:flex">
      {/* Mentor Panel (Left/Top) */}
      <div className="relative flex w-full flex-col justify-between bg-slate-900 p-8 text-white lg:w-1/2">
        <div className="absolute inset-0 opacity-20">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="url(#grad1)" />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 ring-2 ring-blue-400">
               {/* Badge Icon */}
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300">
                 <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z" />
               </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-100">ZooQuest</h1>
          </div>
          
          <div className="space-y-4">
             <div className="flex items-start gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-sm transition-all hover:bg-white/15">
                <div className="shrink-0">
                  {/* Judy Avatar */}
                  <img
                    src="/assets/avatar-judy.png"
                    alt="朱迪"
                    className="h-12 w-12 rounded-full object-cover shadow-md ring-2 ring-blue-300/50"
                  />
                </div>
                <div>
                   <div className="text-sm font-bold text-blue-200">朱迪</div>
                   <p className="mt-1 text-sm leading-relaxed text-blue-50">新手探员，准备好出发了吗？</p>
                </div>
             </div>

             <div className="flex items-start gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-sm transition-all hover:bg-white/15">
                <div className="shrink-0">
                   {/* Nick Avatar */}
                   <img
                     src="/assets/avatar-nick.png"
                     alt="尼克"
                     className="h-12 w-12 rounded-full object-cover shadow-md ring-2 ring-orange-300/50"
                   />
                </div>
                 <div>
                    <div className="text-sm font-bold text-orange-200">尼克</div>
                    <p className="mt-1 text-sm leading-relaxed text-orange-50">别紧张，线索都藏在题目里。</p>
                 </div>
             </div>
          </div>
        </div>

        <div className="relative z-10 mt-8 text-xs text-blue-400/60">
           Zootopia Police Department • Recruitment Division
        </div>
      </div>

      {/* Auth Form (Right/Bottom) */}
      <div className="flex w-full flex-col justify-center bg-white p-8 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-900">
              {mode === "register" ? "新警员报到" : "欢迎回来"}
            </h2>
            <p className="text-sm text-zinc-500">
              {mode === "register" ? "创建一个新身份开始冒险" : "输入口令继续之前的进度"}
            </p>
          </div>

          <div className="flex rounded-lg bg-zinc-100 p-1">
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                mode === "register" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
              onClick={() => {
                setMode("register");
                setCandidates([]);
              }}
            >
              创建角色
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                mode === "login" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
              onClick={() => {
                setMode("login");
                setCandidates([]);
              }}
            >
              继续闯关
            </button>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-zinc-700">昵称</span>
              <input
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="比如：小兔子"
              />
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-zinc-700">闯关口令 (4位数字)</span>
              <input
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                value={pin4}
                onChange={(e) => setPin4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                type="password"
                placeholder="例如：1234"
              />
            </label>

            {mode === "login" ? (
              <div className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700">选择你的头像</span>
                  <Button type="button" variant="ghost" onClick={prelogin} disabled={!nickname || loading}>
                    查找档案
                  </Button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {AVATARS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`aspect-square rounded-lg border text-xs font-medium transition-all ${
                        avatarId === a.id
                          ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                      onClick={() => setAvatarId(a.id)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                {candidates.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    找到 {candidates.length} 个记录
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">选择头像</span>
                <select
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
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
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
               {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="button"
              className="w-full py-6 text-base"
              onClick={() => {
                if (mode === "register") void register();
                else void login();
              }}
              disabled={loading || !nickname || pin4.length !== 4}
            >
              {loading ? "处理中..." : mode === "register" ? "注册并在7天内自动登录" : "登录"}
            </Button>
          </div>
          
          <div className="text-center text-xs text-zinc-400">
            仅用于学习测试 • 不收集个人隐私
          </div>
        </div>
      </div>
    </div>
  );
}
