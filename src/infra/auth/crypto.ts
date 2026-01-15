import "server-only";

import crypto from "node:crypto";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
