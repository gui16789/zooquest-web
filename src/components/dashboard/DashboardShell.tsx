"use client";

import { useCallback } from "react";

import { Dashboard } from "@/components/dashboard/Dashboard";

export function DashboardShell(props: { nickname: string }) {
  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  return <Dashboard nickname={props.nickname} onLogout={reload} />;
}
