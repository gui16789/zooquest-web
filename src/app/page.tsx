import { HomeClient } from "@/components/home/HomeClient";
import { getAuthedUser } from "@/infra/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getAuthedUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 z-0 opacity-5 pointer-events-none overflow-hidden">
        {/* Background Pattern - subtle topography or city map feel */}
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className="relative z-10 w-full max-w-4xl">
        <HomeClient initialUser={user ? { nickname: user.nickname } : null} />
      </div>
    </div>
  );
}
