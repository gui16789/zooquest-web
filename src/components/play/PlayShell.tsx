"use client";

import { useRouter } from "next/navigation";

import { PlayClient } from "@/components/play/PlayClient";

export function PlayShell(props: { unitId: string }) {
  const router = useRouter();
  return <PlayClient unitId={props.unitId} onDone={() => router.push("/")} />;
}
