import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";

const bodySchema = z.object({
  nickname: z.string().trim().min(1).max(24),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("INVALID_INPUT", 400);

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("kid_users")
    .select("id, avatar_id, created_at")
    .eq("nickname", parsed.data.nickname)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) return jsonError(`DB_ERROR:${error.message}`, 500);

  const candidates = (data ?? []).map((u) => ({
    userId: u.id as string,
    avatarId: u.avatar_id as number,
    createdAt: u.created_at as string,
  }));

  return jsonOk({ nickname: parsed.data.nickname, candidates });
}
