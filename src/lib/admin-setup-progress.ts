import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lightweight stand-in for a real setup-progress checklist on the admin
 * company list: state confirmed, at least one vehicle, one client, one
 * rate card. Separate from the dashboard's own six-step onboarding
 * checklist (src/app/(app)/dashboard/setup-checklist.tsx) — unrelated
 * feature, don't conflate the two.
 */
export const ADMIN_SETUP_STEPS_TOTAL = 4;

export async function countAdminSetupSteps(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  companyState: string | null,
): Promise<number> {
  const [
    { count: vehicleCount },
    { count: clientCount },
    { count: rateCardCount },
  ] = await Promise.all([
    admin.from("vehicles").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    admin.from("clients").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    admin.from("rate_cards").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ]);

  let done = 0;
  if (companyState) done++;
  if ((vehicleCount ?? 0) > 0) done++;
  if ((clientCount ?? 0) > 0) done++;
  if ((rateCardCount ?? 0) > 0) done++;
  return done;
}
