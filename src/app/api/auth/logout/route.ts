import { jsonOk } from "@/lib/api";
import { clearSessionCookie } from "@/infra/auth/session";

export async function POST() {
  await clearSessionCookie();
  return jsonOk({});
}
