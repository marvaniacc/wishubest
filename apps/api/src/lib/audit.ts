import { db } from "../db/client.js";
import { auditLogs } from "../db/schema.js";

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: unknown;
  ip?: string | null;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await db().db.insert(auditLogs).values({
      actorId: entry.actorId ?? null,
      actorRole: entry.actorRole ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      changes: (entry.changes ?? null) as never,
      ip: entry.ip ?? null,
    });
  } catch (err) {
    // Auditing must never break the request; log loudly instead.
    req_log_error(err);
  }
}

function req_log_error(err: unknown) {
  console.error("[audit] failed to write audit log", err);
}
