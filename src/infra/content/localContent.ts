import "server-only";

import content from "@/content/content.v1.json";
import type { ContentSchemaV1 } from "@/domain/content/types";

export function getContent(): ContentSchemaV1 {
  const raw: unknown = content;

  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid content JSON");
  }

  const schemaVersion = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (schemaVersion !== 1) {
    throw new Error("Unsupported content schema version");
  }

  return raw as ContentSchemaV1;
}
