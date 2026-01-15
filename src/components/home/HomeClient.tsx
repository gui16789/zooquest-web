"use client";

import { useCallback } from "react";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { Dashboard } from "@/components/dashboard/Dashboard";

type User = { nickname: string };

export function HomeClient(props: { initialUser: User | null }) {
  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  if (!props.initialUser) {
    return <AuthPanel onAuthed={reload} />;
  }

  return <Dashboard nickname={props.initialUser.nickname} onLogout={reload} />;
}
