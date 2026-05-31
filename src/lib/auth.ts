import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Membership, Role } from "@/lib/supabase/types";

const WRITER_ROLES: Role[] = ["owner", "admin", "staff"];

/**
 * Returns the current authenticated user, or redirects to /sign-in if none.
 * Use this at the top of any protected Server Component or Action.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return { supabase, user };
}

/**
 * If the signed-in user has any pending invite (a memberships row with
 * matching invited_email and user_id still null), claim it: bind the row
 * to their user_id and stamp accepted_at. Returns how many invites were
 * claimed, the caller can use that to skip the "no membership →
 * onboarding" redirect.
 *
 * Runs through the admin client because the user can't UPDATE a row
 * where user_id is still null (RLS only matches their own rows).
 */
export async function claimPendingInvites(
  userId: string,
  email: string,
): Promise<number> {
  if (!email) return 0;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("memberships")
    .update({ user_id: userId, accepted_at: new Date().toISOString() })
    .eq("invited_email", email)
    .is("user_id", null)
    .select("id");
  if (error) {
    console.warn(`[claimPendingInvites] ${error.message}`);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Returns the user and their "current" membership (currently the first one).
 * Redirects to /onboarding if the user has no memberships *and* has no
 * pending invites to claim.
 */
export async function requireMembership() {
  const { supabase, user } = await requireUser();

  // First pass, do they already have a membership?
  let { data } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<Membership>();

  // If not, try to claim any invite waiting on their email, then re-query.
  if (!data && user.email) {
    const claimed = await claimPendingInvites(user.id, user.email);
    if (claimed > 0) {
      const retry = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle<Membership>();
      data = retry.data;
    }
  }

  if (!data) redirect("/onboarding");

  return { supabase, user, membership: data };
}

/**
 * For server actions that perform writes. Verifies the user is signed in,
 * looks up their membership via the admin client (so the check itself isn't
 * subject to the policies we're about to write through), and rejects viewers.
 * Returns the admin client so the action can do tenant-scoped writes with
 * explicit company_id.
 */
export async function requireWriter(): Promise<
  | { ok: true; userId: string; companyId: string; role: Role; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ company_id: string; role: Role }>();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "You don't belong to any company yet." };
  if (!WRITER_ROLES.includes(data.role)) {
    return { ok: false, error: "Viewers can't modify data." };
  }

  return {
    ok: true,
    userId: user.id,
    companyId: data.company_id,
    role: data.role,
    admin,
  };
}
