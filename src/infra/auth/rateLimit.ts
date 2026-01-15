import "server-only";

import { getSupabaseAdmin } from "@/infra/supabaseAdmin";

const WINDOW_SECONDS = 10 * 60;
const LOCK_SECONDS = 15 * 60;
const MAX_FAILS_PER_WINDOW = 10;

export type RateLimitKey = {
  nickname: string;
  ip: string;
};

export async function checkAndRecordLoginFailure(key: RateLimitKey): Promise<{
  lockedUntil: string | null;
  failCount: number;
}> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const windowStartedAt = new Date(now.getTime() - WINDOW_SECONDS * 1000);

  const { data: existing, error: selectError } = await supabase
    .from("login_attempts")
    .select("id, window_started_at, fail_count, locked_until")
    .eq("nickname", key.nickname)
    .eq("ip", key.ip)
    .order("window_started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) throw selectError;

  const lockedUntil = existing?.locked_until as string | null | undefined;
  if (lockedUntil && new Date(lockedUntil).getTime() > now.getTime()) {
    return { lockedUntil, failCount: existing?.fail_count ?? 0 };
  }

  const shouldReuseWindow =
    existing && new Date(existing.window_started_at).getTime() > windowStartedAt.getTime();

  if (!existing || !shouldReuseWindow) {
    const { data, error } = await supabase
      .from("login_attempts")
      .insert({
        nickname: key.nickname,
        ip: key.ip,
        window_started_at: now.toISOString(),
        fail_count: 1,
        locked_until: null,
      })
      .select("fail_count, locked_until")
      .single();

    if (error) throw error;
    return {
      lockedUntil: (data.locked_until as string | null) ?? null,
      failCount: (data.fail_count as number) ?? 1,
    };
  }

  const nextFailCount = (existing.fail_count as number) + 1;
  const nextLockedUntil =
    nextFailCount >= MAX_FAILS_PER_WINDOW
      ? new Date(now.getTime() + LOCK_SECONDS * 1000).toISOString()
      : null;

  const { data, error } = await supabase
    .from("login_attempts")
    .update({
      fail_count: nextFailCount,
      locked_until: nextLockedUntil,
    })
    .eq("id", existing.id)
    .select("fail_count, locked_until")
    .single();

  if (error) throw error;

  return {
    lockedUntil: (data.locked_until as string | null) ?? null,
    failCount: (data.fail_count as number) ?? nextFailCount,
  };
}

export async function assertNotLocked(key: RateLimitKey): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date();

  const { data, error } = await supabase
    .from("login_attempts")
    .select("locked_until")
    .eq("nickname", key.nickname)
    .eq("ip", key.ip)
    .order("window_started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const lockedUntil = data?.locked_until as string | null | undefined;
  if (lockedUntil && new Date(lockedUntil).getTime() > now.getTime()) {
    const seconds = Math.ceil((new Date(lockedUntil).getTime() - now.getTime()) / 1000);
    throw new Error(`TOO_MANY_ATTEMPTS:${seconds}`);
  }
}
