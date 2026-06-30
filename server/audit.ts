import type { Actor } from "./auth";
import { adminClient } from "./supabase";

export type AuditAction =
  | "article.create"
  | "article.update"
  | "article.submit"
  | "article.approve"
  | "article.request_changes"
  | "article.unpublish"
  | "article.withdraw"
  | "article.trash"
  | "article.restore"
  | "article.purge"
  | "article.restore_version"
  | "translation.update"
  | "translation.submit"
  | "translation.approve"
  | "translation.request_changes"
  | "translation.unpublish"
  | "translation.withdraw"
  | "translation.restore_version"
  | "template.create"
  | "template.update"
  | "template.delete"
  | "user.role_change"
  | "user.access_roles_change";

/** Append to the audit trail via the service role (audit_log has no insert
 *  policy). Best-effort: never blocks the action. Mirrors src/lib/audit.ts. */
export async function logAudit(input: {
  actor: Actor;
  action: AuditAction;
  targetType: "article" | "user" | "template";
  targetId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const admin = adminClient();
  if (!admin) return;
  try {
    await admin.from("audit_log").insert({
      actor_id: input.actor.userId,
      actor_email: input.actor.email,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      summary: input.summary ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    /* best-effort */
  }
}
