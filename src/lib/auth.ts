import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membership } from "@/lib/supabase/types";

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
 * Returns the user and their "current" membership (currently the first one).
 * Redirects to /onboarding if the user has no companies yet.
 *
 * When we add a multi-company switcher we'll read the active company id
 * from a cookie and look up that membership instead.
 */
export async function requireMembership() {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<Membership>();

  if (error) throw error;
  if (!data) redirect("/onboarding");

  return { supabase, user, membership: data };
}
