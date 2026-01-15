import { HomeClient } from "@/components/home/HomeClient";
import { getAuthedUser } from "@/infra/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getAuthedUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <HomeClient initialUser={user ? { nickname: user.nickname } : null} />
    </div>
  );
}
