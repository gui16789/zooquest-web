import { redirect } from "next/navigation";

import { PlayShell } from "@/components/play/PlayShell";
import { getAuthedUser } from "@/infra/auth/session";

export const dynamic = "force-dynamic";

export default async function PlayPage(props: { params: Promise<{ unitId: string }> }) {
  const user = await getAuthedUser();
  if (!user) redirect("/");

  const { unitId } = await props.params;
  if (!/^u[1-8]$/.test(unitId)) redirect("/");

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 p-6">
      <PlayShell unitId={unitId} />
    </div>
  );
}
