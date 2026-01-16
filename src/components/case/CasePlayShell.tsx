"use client";

import { useRouter } from "next/navigation";

import { CasePlayClient } from "@/components/case/CasePlayClient";

export function CasePlayShell(props: { unitId: string }) {
  const router = useRouter();
  return <CasePlayClient unitId={props.unitId} onDone={() => router.push("/")} />;
}
