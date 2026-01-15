import "server-only";

import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";

import { getServerEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { randomToken, sha256Hex } from "@/infra/auth/crypto";

export type AuthedUser = {
  kidUserId: string;
  nickname: string;
  avatarId: number;
};

export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return hdrs.get("x-real-ip") ?? "unknown";
}

export async function createSessionCookie(kidUserId: string): Promise<void> {
  const env = getServerEnv();
  const supabase = getSupabaseAdmin();

  const token = randomToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + env.ZQ_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("kid_sessions").insert({
    kid_user_id: kidUserId,
    session_token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;

  const cookieStore = await cookies();
  cookieStore.set(env.ZQ_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(env.ZQ_SESSION_COOKIE_NAME)?.value;
  if (!token) return;

  const supabase = getSupabaseAdmin();
  const tokenHash = sha256Hex(token);

  await supabase.from("kid_sessions").delete().eq("session_token_hash", tokenHash);

  cookieStore.delete(env.ZQ_SESSION_COOKIE_NAME);
}


export async function getAuthedUser(): Promise<AuthedUser | null> {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(env.ZQ_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const tokenHash = sha256Hex(token);

  const { data: session, error: sessionError } = await supabase
    .from("kid_sessions")
    .select("kid_user_id, expires_at")
    .eq("session_token_hash", tokenHash)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) return null;

  const expiresAt = new Date(session.expires_at as string);
  if (expiresAt.getTime() <= Date.now()) {
    await supabase.from("kid_sessions").delete().eq("session_token_hash", tokenHash);
    return null;
  }

  // Sliding expiration: refresh last_seen_at only (MVP) to keep logic simple.
  await supabase
    .from("kid_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("session_token_hash", tokenHash);

  const { data: user, error: userError } = await supabase
    .from("kid_users")
    .select("id, nickname, avatar_id")
    .eq("id", session.kid_user_id)
    .single();

  if (userError) throw userError;

  return {
    kidUserId: user.id as string,
    nickname: user.nickname as string,
    avatarId: user.avatar_id as number,
  };
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return bcrypt.compare(pin, pinHash);
}

export async function hashPin(pin: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(pin, saltRounds);
}
