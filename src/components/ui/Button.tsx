import React from "react";

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" },
) {
  const { className, variant = "primary", ...rest } = props;

  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-black text-white hover:bg-zinc-800"
      : "bg-transparent text-black hover:bg-zinc-100";

  return <button className={`${base} ${styles} ${className ?? ""}`.trim()} {...rest} />;
}
