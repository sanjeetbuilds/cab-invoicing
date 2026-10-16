import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * "Must change password" lives on the auth user itself (Supabase's
 * per-user metadata), not in a project table — it's a property of the
 * login, not of any one company, which matters because the same person
 * can be added as owner of a second company later and shouldn't get a
 * second independent expiry clock.
 */
export const TEMP_PASSWORD_EXPIRY_DAYS = 7;

export interface TempPasswordMeta {
  must_change_password?: boolean;
  temp_password_set_at?: string;
}

export function isTempPasswordExpired(setAtIso: string | undefined): boolean {
  if (!setAtIso) return false;
  const ageMs = Date.now() - new Date(setAtIso).getTime();
  return ageMs > TEMP_PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Marks a user as needing to change their password before anything else
 * is reachable, and stamps when the temporary password was set (for the
 * 7-day expiry check at sign-in). Reads first and spreads over the
 * existing metadata — updateUserById's user_metadata otherwise replaces
 * the object wholesale.
 */
export async function markMustChangePassword(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  const { data } = await admin.auth.admin.getUserById(userId);
  const existing = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existing,
      must_change_password: true,
      temp_password_set_at: new Date().toISOString(),
    },
  });
}

/** Called once the user has successfully set their own password. */
export async function clearMustChangePassword(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  const { data } = await admin.auth.admin.getUserById(userId);
  const existing = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existing,
      must_change_password: false,
    },
  });
}

/**
 * Shared by /set-password and the "Forgot password" reset flow — either
 * one counts as "they've now set their own password": clears the forced
 * flag, and if this person is a pending owner, activates their company.
 */
export async function completeForcedPasswordChange(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  await clearMustChangePassword(admin, userId);

  const { data: memberships } = await admin
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", userId)
    .returns<{ company_id: string; role: string }[]>();
  const ownerCompanyIds = (memberships ?? [])
    .filter((m) => m.role === "owner")
    .map((m) => m.company_id);
  if (ownerCompanyIds.length > 0) {
    await admin
      .from("companies")
      .update({ status: "active" })
      .in("id", ownerCompanyIds)
      .eq("status", "invited");
  }
}
