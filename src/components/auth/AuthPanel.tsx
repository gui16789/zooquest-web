import Image from "next/image";

import judyAvatar from "../../../public/assets/avatar-judy.jpg";
import nickAvatar from "../../../public/assets/avatar-nick.jpg";

import { AuthFormClient } from "@/components/auth/AuthFormClient";

export function AuthPanel() {
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
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-300"
              >
                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-100">ZooQuest</h1>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-sm transition-all hover:bg-white/15">
              <div className="shrink-0">
                <Image
                  src={judyAvatar}
                  alt="朱迪"
                  width={48}
                  height={48}
                  priority
                  sizes="48px"
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
                <Image
                  src={nickAvatar}
                  alt="尼克"
                  width={48}
                  height={48}
                  priority
                  sizes="48px"
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

      <div className="flex w-full flex-col justify-center bg-white p-8 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-zinc-900">闯关入口</h2>
            <p className="text-sm text-zinc-500">创建角色或继续闯关，进度会自动保存。</p>
          </div>

          <AuthFormClient />

          <div className="text-center text-xs text-zinc-500">仅用于学习测试 • 不收集个人隐私</div>
        </div>
      </div>
    </div>
  );
}
