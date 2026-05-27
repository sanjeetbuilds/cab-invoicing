"use server";

import { revalidatePath } from "next/cache";
import { requireWriter } from "@/lib/auth";
import {
  PROTOTYPE_CLIENTS,
  PROTOTYPE_VEHICLES,
  PROTOTYPE_RATE_CARDS,
} from "@/lib/prototype-seed";

export type SeedResult =
  | {
      ok: true;
      counts: { clients: number; vehicles: number; rateCards: number };
    }
  | { ok: false; error: string };

export async function seedFromPrototype(force = false): Promise<SeedResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  const { admin, companyId } = ctx;

  // Idempotency: refuse if the company already has clients.
  if (!force) {
    const { count } = await admin
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error:
          "This company already has clients. Delete them first if you want a clean seed.",
      };
    }
  }

  // 1. Clients — capture new UUIDs keyed by seed id.
  const { data: insertedClients, error: cErr } = await admin
    .from("clients")
    .insert(
      PROTOTYPE_CLIENTS.map((c) => ({
        company_id: companyId,
        name: c.name,
        gstin: c.gstin || null,
        address: c.address || null,
        state: c.state,
        is_rcm: c.is_rcm,
        default_booked_by: c.default_booked_by || null,
      })),
    )
    .select("id, name");

  if (cErr) return { ok: false, error: `clients: ${cErr.message}` };

  const clientIdMap = new Map<string, string>();
  for (const seed of PROTOTYPE_CLIENTS) {
    const inserted = insertedClients?.find((r) => r.name === seed.name);
    if (inserted) clientIdMap.set(seed.seedId, inserted.id);
  }

  // 2. Vehicles.
  const { error: vErr } = await admin.from("vehicles").insert(
    PROTOTYPE_VEHICLES.map((v) => ({
      company_id: companyId,
      number: v.number,
      type: v.type,
      ownership: v.ownership,
      active: true,
    })),
  );
  if (vErr) return { ok: false, error: `vehicles: ${vErr.message}` };

  // 3. Rate cards — map seed client_seed_id → real client uuid.
  const cardRows = PROTOTYPE_RATE_CARDS.map((r) => {
    const clientId = clientIdMap.get(r.client_seed_id);
    if (!clientId) return null;
    return {
      company_id: companyId,
      client_id: clientId,
      car_type: r.car_type,
      mode: r.mode,
      base_rate: r.base_rate ?? null,
      base_kms: r.base_kms ?? null,
      base_hours: r.base_hours ?? null,
      extra_km: r.extra_km ?? null,
      extra_hour: r.extra_hour ?? null,
      night: r.night ?? null,
      per_km: r.per_km ?? null,
      driver_ta: r.driver_ta ?? null,
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  const { error: rErr } = await admin.from("rate_cards").insert(cardRows);
  if (rErr) return { ok: false, error: `rate_cards: ${rErr.message}` };

  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath("/vehicles");
  revalidatePath("/rate-cards");

  return {
    ok: true,
    counts: {
      clients: insertedClients?.length ?? 0,
      vehicles: PROTOTYPE_VEHICLES.length,
      rateCards: cardRows.length,
    },
  };
}
