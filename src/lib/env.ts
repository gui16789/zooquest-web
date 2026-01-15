import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_ORIGIN: z.string().url().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ZQ_SESSION_COOKIE_NAME: z.string().min(1).default("zq_session"),
  ZQ_SESSION_TTL_DAYS: z
    .string()
    .regex(/^\d+$/)
    .default("7")
    .transform((v) => Number(v)),
});

export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server env: ${parsed.error.message}`);
  }
  return parsed.data;
}
