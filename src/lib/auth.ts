import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSelectedCompanyId } from "@/lib/current-company";
import type { Membership, Role } from "@/lib/supabase/types";

const WRITER_ROLES: Role[] = ["owner", "admin", "staff"];

/**
 * Returns the current authenticated user, or redirects to /sign-in if none.
 * Use this at the top of any protected Server Component or Action.
 *
 * Wrapped in React's request-scoped cache so the layout's call and
 * every page's call in the same render share one network round
 * trip to Supabase Auth, instead of revalidating the session 3+
 * times per navigation.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return { supabase, user };
});

/**
 * Returns the user, their full list of memberships (for the company
 * switcher), and the "current" one: whichever company_id is in the
 * current_company_id cookie, falling back to the first membership by
 * creation order for single-company users or a switcher that hasn't been
 * used yet. Redirects to /onboarding if the user has no memberships —
 * every account is created with a membership already attached (the admin
 * panel and team invites both do this atomically), so this only happens
 * if their last membership was later removed.
 *
 * Cached per request so the layout and every page share one
 * memberships lookup, regardless of how many components call this.
 */
export const requireMembership = cache(async () => {
  const { supabase, user } = await requireUser();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .returns<Membership[]>();

  if (!memberships || memberships.length === 0) redirect("/onboarding");

  const selectedId = await getSelectedCompanyId();
  const membership =
    memberships.find((m) => m.company_id === selectedId) ?? memberships[0];

  return { supabase, user, membership, memberships };
});

/**
 * For server actions that perform writes. Verifies the user is signed in,
 * looks up their membership via the admin client (so the check itself isn't
 * subject to the policies we're about to write through), matches the same
 * company the switcher currently has selected, rejects viewers, and rejects
 * a suspended company. Returns the admin client so the action can do
 * tenant-scoped writes with explicit company_id.
 */
export async function requireWriter(): Promise<
  | {
      ok: true;
      userId: string;
      userEmail: string;
      companyId: string;
      role: Role;
      admin: ReturnType<typeof createAdminClient>;
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .returns<{ company_id: string; role: Role }[]>();

  if (error) return { ok: false, error: error.message };
  if (!memberships || memberships.length === 0) {
    return { ok: false, error: "You don't belong to any company yet." };
  }

  // Match the same company the user is currently viewing (per the
  // switcher cookie), not just whichever membership they joined first —
  // otherwise a multi-company user's writes could land in the wrong
  // tenant while they're looking at another one.
  const selectedId = await getSelectedCompanyId();
  const current =
    memberships.find((m) => m.company_id === selectedId) ?? memberships[0];

  if (!WRITER_ROLES.includes(current.role)) {
    return { ok: false, error: "Viewers can't modify data." };
  }

  const { data: companyRow } = await admin
    .from("companies")
    .select("status")
    .eq("id", current.company_id)
    .maybeSingle<{ status: string }>();
  if (companyRow?.status === "suspended") {
    return {
      ok: false,
      error: "Your account is paused. Contact us to restore access.",
    };
  }

  return {
    ok: true,
    userId: user.id,
    userEmail: user.email ?? "",
    companyId: current.company_id,
    role: current.role,
    admin,
  };
}

/**
 * True platform-operator check, entirely separate from per-company roles.
 * Reads the super_admins allow-list through the service-role client, which
 * is the only way anything can read that table — it has RLS enabled with
 * zero policies. Rows are added by hand in the SQL editor, never via a
 * screen or action.
 *
 * Use at the top of any /admin Server Component. A non-super-admin gets a
 * plain 404 rather than a "no access" page, so the admin surface isn't
 * advertised to anyone poking at the URL.
 */
export const requireSuperAdmin = cache(async () => {
  const { user } = await requireUser();
  const admin = createAdminClient();
  const { data } = await admin
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle<{ user_id: string }>();
  if (!data) notFound();
  return { user, admin };
});

/** True/false version for places that need to branch UI (e.g. the sidebar
 *  "Admin" link) without throwing a 404 themselves. */
export const isSuperAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle<{ user_id: string }>();
  return data != null;
});

/**
 * Same check as requireSuperAdmin, but for use inside Server Actions
 * (mutations), which need an error result instead of a thrown 404.
 */
export async function requireSuperAdminAction(): Promise<
  | { ok: true; userId: string; userEmail: string; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { data } = await admin
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle<{ user_id: string }>();
  if (!data) return { ok: false, error: "Not authorized." };

  return { ok: true, userId: user.id, userEmail: user.email ?? "", admin };
}
