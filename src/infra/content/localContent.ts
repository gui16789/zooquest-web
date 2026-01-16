import "server-only";

import content from "@/content/content.v2.json";
import type { ContentSchema } from "@/domain/content/types";

export function getContent(): ContentSchema {
  const raw: unknown = content;

  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid content JSON");
  }

  const schemaVersion = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2) {
    throw new Error("Unsupported content schema version");
  }

  return raw as ContentSchema;
}
