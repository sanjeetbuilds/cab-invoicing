import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Help pages are reachable signed-out, but still personalize the contact
 * block's mailto when someone IS signed in. Unlike requireMembership(),
 * this never redirects — there is no "no company yet" case here, just
 * "nothing to prefill."
 */
export async function getOptionalViewer(): Promise<{
  email: string | null;
  name: string | null;
  companyName: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { email: null, name: null, companyName: null };

  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id, member_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ company_id: string; member_name: string | null }>();

  let companyName: string | null = null;
  if (membership) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", membership.company_id)
      .maybeSingle<{ name: string }>();
    companyName = company?.name ?? null;
  }

  return { email: user.email ?? null, name: membership?.member_name ?? null, companyName };
}
