import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { createSessionCookie, getClientIp, hashPin } from "@/infra/auth/session";

const bodySchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  avatarId: z.number().int().min(1).max(50),
  pin4: z.string().regex(/^\d{4}$/),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("INVALID_INPUT", 400);

  const { nickname, avatarId, pin4 } = parsed.data;

  const supabase = getSupabaseAdmin();
  const pinHash = await hashPin(pin4);

  const { data: user, error } = await supabase
    .from("kid_users")
    .insert({ nickname, avatar_id: avatarId, pin_hash: pinHash })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return jsonError("NICKNAME_AVATAR_EXISTS", 409);
    return jsonError(`DB_ERROR:${error.message}`, 500);
  }

  await createSessionCookie(user.id as string);

  return jsonOk({ userId: user.id, nickname, avatarId, ip: await getClientIp() });
}
