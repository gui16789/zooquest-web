import { redirect } from "next/navigation";

import { getAuthedUser } from "@/infra/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/");
  redirect("/map");
}
