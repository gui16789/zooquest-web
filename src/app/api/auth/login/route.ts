import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { assertNotLocked, checkAndRecordLoginFailure } from "@/infra/auth/rateLimit";
import { createSessionCookie, getClientIp, verifyPin } from "@/infra/auth/session";

const bodySchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  avatarId: z.number().int().min(1).max(50),
  pin4: z.string().regex(/^\d{4}$/),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("INVALID_INPUT", 400);

  const { nickname, avatarId, pin4 } = parsed.data;
  const ip = await getClientIp();

  try {
    await assertNotLocked({ nickname, ip });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TOO_MANY_ATTEMPTS";
    if (msg.startsWith("TOO_MANY_ATTEMPTS")) return jsonError(msg, 429);
    return jsonError("RATE_LIMIT_ERROR", 500);
  }

  const supabase = getSupabaseAdmin();

  const { data: user, error } = await supabase
    .from("kid_users")
    .select("id, pin_hash")
    .eq("nickname", nickname)
    .eq("avatar_id", avatarId)
    .maybeSingle();

  if (error) return jsonError(`DB_ERROR:${error.message}`, 500);
  if (!user) {
    await checkAndRecordLoginFailure({ nickname, ip });
    return jsonError("LOGIN_FAILED", 401);
  }

  const ok = await verifyPin(pin4, user.pin_hash as string);
  if (!ok) {
    const { lockedUntil } = await checkAndRecordLoginFailure({ nickname, ip });
    if (lockedUntil) return jsonError("TOO_MANY_ATTEMPTS", 429);
    return jsonError("LOGIN_FAILED", 401);
  }

  await createSessionCookie(user.id as string);
  return jsonOk({ nickname, avatarId, userId: user.id });
}
