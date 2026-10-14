import { pool } from "../db/pool";

export async function logAudit(entry: {
  actorType: "user" | "admin" | "system";
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, ip_address, metadata)
       VALUES (?,?,?,?,?,?,?)`,
      [
        entry.actorType,
        entry.actorId ?? null,
        entry.action,
        entry.targetType ?? null,
        entry.targetId ?? null,
        entry.ipAddress ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ]
    );
  } catch (err) {
    // Audit logging must never take down the request path it's observing.
    console.error("[audit] failed to write entry", err);
  }
}
