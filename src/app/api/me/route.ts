import { jsonOk } from "@/lib/api";
import { getAuthedUser } from "@/infra/auth/session";

export async function GET() {
  const user = await getAuthedUser();
  return jsonOk({ user });
}
