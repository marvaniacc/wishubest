import { db } from "../db/client.js";
import { auditLogs } from "../db/schema.js";
import type { AuthUser } from "./auth.js";

/** Fire-and-forget audit entry. Never throws into the business flow. */
export function audit(
  actor: AuthUser | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
): void {
  db.insert(auditLogs)
    .values({
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action,
      entityType,
      entityId,
      metadata: metadata ?? null,
    })
    .catch((err) => console.error("[audit] insert failed:", err.message));
}
