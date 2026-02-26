"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Badge, Lock, Fingerprint, HelpCircle, ArrowLeft, Loader2 } from "lucide-react";

type Candidate = { userId: string; avatarId: number; createdAt: string };

const AVATARS: Array<{ id: number; label: string }> = [
  { id: 1, label: "朱迪" },
  { id: 2, label: "尼克" },
  { id: 3, label: "树懒" },
  { id: 4, label: "豹警官" },
  { id: 5, label: "小羊" },
];

export default function LoginPage() {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [nickname, setNickname] = useState("");
  const [pin4, setPin4] = useState("");
  const [avatarId, setAvatarId] = useState<number>(1);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onAuthed() {
    window.location.href = "/map";
  }

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
      onAuthed();
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
      onAuthed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "LOGIN_FAILED");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a101d]">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-[#0a101d] to-purple-900/20" />
      
      {/* Animated Grid */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a101d] via-[#0a101d]/80 to-blue-900/20" />

      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">返回首页</span>
      </Link>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md p-6">
        <div className="bg-[#111722]/90 backdrop-blur-xl border border-blue-500/30 rounded-3xl shadow-2xl overflow-hidden relative">
          
          {/* Top Gradient Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 animate-pulse" />
          
          <div className="p-8 md:p-10">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="size-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-4 ring-4 ring-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                <Shield className="w-10 h-10 text-blue-500" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">ZPD 警务系统</h1>
              <p className="text-blue-300/60 text-sm font-medium tracking-widest uppercase mt-1">
                Secure Officer Access Terminal
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex rounded-xl bg-[#0a101d] p-1.5 mb-6 border border-slate-800">
              <button
                type="button"
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                  mode === "register"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => {
                  setMode("register");
                  setCandidates([]);
                }}
              >
                新探员注册
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                  mode === "login"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => {
                  setMode("login");
                  setCandidates([]);
                }}
              >
                老探员登录
              </button>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-5">
              {/* Nickname Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-blue-300 uppercase tracking-wider ml-1">
                  探员代号 (Officer Name)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Badge className="w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="输入你的探员代号"
                    className="w-full bg-[#0a101d] border border-slate-700 text-white rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 font-medium"
                  />
                </div>
              </div>

              {/* PIN Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-blue-300 uppercase tracking-wider ml-1">
                  安全口令 (4位数字)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={pin4}
                    onChange={(e) => setPin4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    placeholder="••••"
                    maxLength={4}
                    className="w-full bg-[#0a101d] border border-slate-700 text-white rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 font-mono tracking-widest"
                  />
                </div>
              </div>

              {/* Avatar Selection - Register Mode */}
              {mode === "register" && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-blue-300 uppercase tracking-wider ml-1">
                    选择形象 (Select Avatar)
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setAvatarId(avatar.id)}
                        className={`aspect-square rounded-xl border text-xs font-bold transition-all ${
                          avatarId === avatar.id
                            ? "border-blue-500 bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/30"
                            : "border-slate-700 bg-[#0a101d] text-slate-400 hover:border-slate-600 hover:text-slate-300"
                        }`}
                      >
                        {avatar.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Avatar Selection - Login Mode */}
              {mode === "login" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-300 uppercase tracking-wider ml-1">
                      验证身份 (Verify Identity)
                    </label>
                    <button
                      type="button"
                      onClick={prelogin}
                      disabled={!nickname || loading}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      查找档案
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setAvatarId(avatar.id)}
                        className={`aspect-square rounded-xl border text-xs font-bold transition-all ${
                          avatarId === avatar.id
                            ? "border-blue-500 bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/30"
                            : "border-slate-700 bg-[#0a101d] text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {avatar.label}
                      </button>
                    ))}
                  </div>
                  {candidates.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      找到 {candidates.length} 个探员档案
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => {
                  if (mode === "register") void register();
                  else void login();
                }}
                disabled={loading || !nickname || pin4.length !== 4}
                className="mt-2 w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/40 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>验证中...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    <span>{mode === "register" ? "注册并加入警局" : "身份验证登录"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#0f1520] px-8 py-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center">
              Zootopia Police Department • Recruitment Division
            </p>
          </div>
        </div>

        {/* Help Link */}
        <div className="text-center mt-6">
          <button className="text-slate-500 hover:text-white text-sm transition-colors flex items-center justify-center gap-1.5 mx-auto">
            <HelpCircle className="w-4 h-4" />
            <span>需要帮助？联系豹警官</span>
          </button>
        </div>
      </div>
    </div>
  );
}
