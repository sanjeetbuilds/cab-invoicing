import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { AuditAction } from "@/lib/supabase/types";

/**
 * Records an admin-panel action for "View details" history. Never throws —
 * a logging failure shouldn't block the real action (suspend/create/etc.)
 * from completing; it's reported to the server console instead.
 */
export async function logAdminAction(
  admin: ReturnType<typeof createAdminClient>,
  args: {
    companyId: string | null;
    actorUserId: string;
    actorEmail: string | null;
    action: AuditAction;
    reason?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  const { error } = await admin.from("admin_audit_log").insert({
    company_id: args.companyId,
    actor_user_id: args.actorUserId,
    actor_email: args.actorEmail,
    action: args.action,
    reason: args.reason ?? null,
    metadata: args.metadata ?? null,
  });
  if (error) {
    console.error(`[audit-log] ${args.action} failed: ${error.message}`);
  }
}
