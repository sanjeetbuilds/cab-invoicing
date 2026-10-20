import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UnbilledClientSummary {
  clientId: string;
  clientName: string;
  count: number;
  oldestDate: string;
}

/**
 * Every client with at least one uninvoiced trip, oldest-first — used by
 * both the dashboard's smart reminder and the Trips page's "Ready to
 * bill" prompt, so a company always sees the same answer to "who's
 * waiting to be billed?" wherever they look.
 */
export async function getUnbilledTripsByClient(
  // Loosely typed on purpose: works with either the user-scoped client
  // (RLS applies) or the service-role admin client, callers pick.
  supabase: SupabaseClient,
  companyId: string,
): Promise<UnbilledClientSummary[]> {
  const [{ data: trips }, { data: clients }] = await Promise.all([
    supabase
      .from("trips")
      .select("client_id, date")
      .eq("company_id", companyId)
      .eq("invoiced", false)
      .returns<{ client_id: string; date: string }[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", companyId)
      .returns<{ id: string; name: string }[]>(),
  ]);

  const nameById = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const byClient = new Map<string, { count: number; oldestDate: string }>();
  for (const t of trips ?? []) {
    const existing = byClient.get(t.client_id);
    if (!existing) {
      byClient.set(t.client_id, { count: 1, oldestDate: t.date });
    } else {
      existing.count += 1;
      if (t.date < existing.oldestDate) existing.oldestDate = t.date;
    }
  }

  return Array.from(byClient.entries())
    .map(([clientId, v]) => ({
      clientId,
      clientName: nameById.get(clientId) ?? "Unknown client",
      count: v.count,
      oldestDate: v.oldestDate,
    }))
    .sort((a, b) => a.oldestDate.localeCompare(b.oldestDate));
}
