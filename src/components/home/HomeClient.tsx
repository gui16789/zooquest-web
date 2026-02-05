"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";

const Dashboard = dynamic(
  () => import("@/components/dashboard/Dashboard").then((m) => m.Dashboard),
  {
    loading: () => <div className="text-sm text-zinc-600">加载中…</div>,
  },
);

type User = { nickname: string };

export function HomeClient(props: { initialUser: User }) {
  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  return <Dashboard nickname={props.initialUser.nickname} onLogout={reload} />;
}
