"use client";

import { useRouter } from "next/navigation";

import { BossPlayClient } from "@/components/boss/BossPlayClient";

export function BossPlayShell(props: { unitId: string }) {
  const router = useRouter();
  return <BossPlayClient unitId={props.unitId} onDone={() => router.push("/")} />;
}
