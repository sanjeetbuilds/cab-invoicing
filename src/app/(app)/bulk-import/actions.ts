"use server";

import { revalidatePath } from "next/cache";
import { requireWriter } from "@/lib/auth";
import { parseWorkbookBuffer } from "@/lib/bulk-import/parser";
import type {
  ParsedWorkbook,
  ImportEntity,
} from "@/lib/bulk-import/types";

/** Decode a base64 payload back to the original .xlsx bytes. */
function base64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}

const SCOPE_MAP: Record<ImportEntity, "clients" | "vehicles" | "rate_cards" | "all"> = {
  clients: "clients",
  vehicles: "vehicles",
  rate_cards: "rate_cards",
  all: "all",
};

export interface PreviewResult {
  ok: true;
  preview: ParsedWorkbook;
}
export interface PreviewError {
  ok: false;
  error: string;
}

/**
 * Parse the uploaded workbook into a preview without writing anything.
 * Also cross-checks: rate-card rows whose client_name doesn't match an
 * existing DB client OR a client in this same upload get an error.
 */
export async function previewImportAction(args: {
  /** Base64-encoded file bytes. */
  fileBase64: string;
  scope: ImportEntity;
}): Promise<PreviewResult | PreviewError> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  let parsed: ParsedWorkbook;
  try {
    parsed = await parseWorkbookBuffer(
      base64ToBuffer(args.fileBase64),
      SCOPE_MAP[args.scope],
    );
  } catch (e) {
    const err = e as Error;
    return { ok: false, error: `Couldn't read the file: ${err.message}` };
  }

  // If the workbook produced nothing parseable AND there's a top-level
  // explanation, surface it to the UI as a parse error so the user
  // sees the red Try-again state instead of an empty preview.
  if (
    parsed.topErrors.length > 0 &&
    parsed.clients.length === 0 &&
    parsed.vehicles.length === 0 &&
    parsed.rateCards.length === 0
  ) {
    return { ok: false, error: parsed.topErrors.join(" ") };
  }

  // Cross-check rate-card client names against existing DB clients +
  // the client rows already in this upload. Also annotate each rate
  // card row with whether it would update an existing card and
  // whether its client is brand-new in this upload.
  if (parsed.rateCards.length > 0) {
    const [{ data: dbClients }, { data: dbRateCards }] = await Promise.all([
      ctx.admin
        .from("clients")
        .select("id, name")
        .eq("company_id", ctx.companyId)
        .returns<{ id: string; name: string }[]>(),
      ctx.admin
        .from("rate_cards")
        .select("client_id, car_type, mode, plan_name")
        .eq("company_id", ctx.companyId)
        .returns<{ client_id: string; car_type: string; mode: string; plan_name: string | null }[]>(),
    ]);
    const dbClientNames = new Set(
      (dbClients ?? []).map((c) => c.name.toLowerCase()),
    );
    const clientIdByName = new Map(
      (dbClients ?? []).map((c) => [c.name.toLowerCase(), c.id] as const),
    );
    const uploadClientNames = new Set<string>();
    for (const row of parsed.clients) {
      if (row.errors.length === 0) {
        uploadClientNames.add(row.data.name.toLowerCase());
      }
    }
    const existingRcKey = new Set(
      (dbRateCards ?? []).map(
        (r) => `${r.client_id}|${r.car_type}|${r.mode}|${r.plan_name ?? ""}`,
      ),
    );
    for (const rc of parsed.rateCards) {
      const nameLower = rc.data.client_name.toLowerCase();
      const inDb = dbClientNames.has(nameLower);
      const inUpload = uploadClientNames.has(nameLower);
      if (rc.errors.length === 0 && !inDb && !inUpload) {
        rc.errors.push(
          `Client '${rc.data.client_name}' not found in your existing clients or in this upload's Clients sheet.`,
        );
      }
      // Annotate even if the row has errors — UI tooltip can still
      // show "would update / new client" context to help the user fix.
      const cid = clientIdByName.get(nameLower);
      const key = cid
        ? `${cid}|${rc.data.car_type}|${rc.data.mode}|${rc.data.plan_name ?? ""}`
        : null;
      rc.meta = {
        willUpdate: key ? existingRcKey.has(key) : false,
        clientIsNew: !inDb && inUpload,
      };
    }
  }

  // Vehicle duplicate-within-upload check (same number twice).
  const seenVehicleNumbers = new Set<string>();
  for (const v of parsed.vehicles) {
    if (v.errors.length > 0) continue;
    const key = v.data.number.toUpperCase();
    if (seenVehicleNumbers.has(key)) {
      v.errors.push(`Duplicate vehicle '${v.data.number}' in this upload.`);
    } else {
      seenVehicleNumbers.add(key);
    }
  }

  // Client name duplicate-within-upload check.
  const seenClientNames = new Set<string>();
  for (const c of parsed.clients) {
    if (c.errors.length > 0) continue;
    const key = c.data.name.toLowerCase();
    if (seenClientNames.has(key)) {
      c.errors.push(`Duplicate client name '${c.data.name}' in this upload.`);
    } else {
      seenClientNames.add(key);
    }
  }

  // Rate-card duplicate-within-upload — same (client, car, mode, plan).
  const seenRcKeys = new Set<string>();
  for (const rc of parsed.rateCards) {
    if (rc.errors.length > 0) continue;
    const key = `${rc.data.client_name.toLowerCase()}|${rc.data.car_type}|${rc.data.mode}|${rc.data.plan_name ?? ""}`;
    if (seenRcKeys.has(key)) {
      rc.errors.push(
        `Duplicate rate card for ${rc.data.client_name} · ${rc.data.car_type} · ${rc.data.mode} in this upload.`,
      );
    } else {
      seenRcKeys.add(key);
    }
  }

  return { ok: true, preview: parsed };
}

export interface ImportResult {
  ok: true;
  clients: number;
  vehicles: number;
  rateCards: number;
  rateCardsUpdated: number;
}
export interface ImportError {
  ok: false;
  error: string;
}

/**
 * Commit the import. Re-parses + re-validates the file (don't trust the
 * client's filtered list) and writes only the rows that pass.
 * Clients first → Vehicles → Rate Cards (rate cards need clients).
 */
export async function commitImportAction(args: {
  fileBase64: string;
  scope: ImportEntity;
}): Promise<ImportResult | ImportError> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  let parsed: ParsedWorkbook;
  try {
    parsed = await parseWorkbookBuffer(
      base64ToBuffer(args.fileBase64),
      SCOPE_MAP[args.scope],
    );
  } catch (e) {
    return { ok: false, error: `Couldn't re-read the file: ${(e as Error).message}` };
  }

  // ─── Clients: upsert by name within this company (case-insensitive
  //              dedupe via existing query first; we do it server-side
  //              to keep error messages tight).
  const goodClients = parsed.clients.filter((r) => r.errors.length === 0);
  let insertedClients = 0;
  if (goodClients.length > 0) {
    const { data: existing } = await ctx.admin
      .from("clients")
      .select("id, name")
      .eq("company_id", ctx.companyId)
      .returns<{ id: string; name: string }[]>();
    const byName = new Map(
      (existing ?? []).map((c) => [c.name.toLowerCase(), c.id] as const),
    );
    const toInsert: Record<string, unknown>[] = [];
    for (const r of goodClients) {
      const key = r.data.name.toLowerCase();
      if (byName.has(key)) continue; // skip — already exists
      toInsert.push({
        company_id: ctx.companyId,
        name: r.data.name,
        gstin: r.data.gstin,
        state: r.data.state,
        address: r.data.address,
        default_booked_by: r.data.default_booked_by,
        is_rcm: r.data.is_rcm,
        is_quick_customer: false,
        notes: r.data.notes,
      });
    }
    if (toInsert.length > 0) {
      const { error } = await ctx.admin.from("clients").insert(toInsert);
      if (error) return { ok: false, error: `Client insert failed: ${error.message}` };
      insertedClients = toInsert.length;
    }
  }

  // ─── Vehicles: same shape, upsert by number.
  const goodVehicles = parsed.vehicles.filter((r) => r.errors.length === 0);
  let insertedVehicles = 0;
  if (goodVehicles.length > 0) {
    const { data: existing } = await ctx.admin
      .from("vehicles")
      .select("id, number")
      .eq("company_id", ctx.companyId)
      .returns<{ id: string; number: string }[]>();
    const byNumber = new Map(
      (existing ?? []).map((v) => [v.number.toUpperCase(), v.id] as const),
    );
    const toInsert: Record<string, unknown>[] = [];
    for (const r of goodVehicles) {
      const key = r.data.number.toUpperCase();
      if (byNumber.has(key)) continue;
      toInsert.push({
        company_id: ctx.companyId,
        number: r.data.number,
        type: r.data.type,
        ownership: r.data.ownership,
        vendor_name: r.data.vendor_name,
        active: r.data.active,
      });
    }
    if (toInsert.length > 0) {
      const { error } = await ctx.admin.from("vehicles").insert(toInsert);
      if (error) return { ok: false, error: `Vehicle insert failed: ${error.message}` };
      insertedVehicles = toInsert.length;
    }
  }

  // ─── Rate cards: upsert by (company, client, car, mode, plan) — the
  //                unique index added in migration 0007 takes care of
  //                conflict resolution.
  const goodRateCards = parsed.rateCards.filter((r) => r.errors.length === 0);
  let insertedRateCards = 0;
  let updatedRateCards = 0;
  if (goodRateCards.length > 0) {
    // Look up every client we'll reference, including the ones we just
    // inserted above.
    const { data: clientsNow } = await ctx.admin
      .from("clients")
      .select("id, name")
      .eq("company_id", ctx.companyId)
      .returns<{ id: string; name: string }[]>();
    const idByName = new Map(
      (clientsNow ?? []).map((c) => [c.name.toLowerCase(), c.id] as const),
    );

    // Read existing rate cards to count create-vs-update for the report.
    const { data: existingRC } = await ctx.admin
      .from("rate_cards")
      .select("client_id, car_type, mode, plan_name")
      .eq("company_id", ctx.companyId)
      .returns<
        { client_id: string; car_type: string; mode: string; plan_name: string | null }[]
      >();
    const existingKey = new Set(
      (existingRC ?? []).map(
        (r) => `${r.client_id}|${r.car_type}|${r.mode}|${r.plan_name ?? ""}`,
      ),
    );

    const rows: Record<string, unknown>[] = [];
    for (const r of goodRateCards) {
      const cid = idByName.get(r.data.client_name.toLowerCase());
      if (!cid) {
        r.errors.push(`Client '${r.data.client_name}' couldn't be linked after import.`);
        continue;
      }
      const key = `${cid}|${r.data.car_type}|${r.data.mode}|${r.data.plan_name ?? ""}`;
      if (existingKey.has(key)) updatedRateCards++;
      else insertedRateCards++;
      rows.push({
        company_id: ctx.companyId,
        client_id: cid,
        car_type: r.data.car_type,
        mode: r.data.mode,
        plan_name: r.data.plan_name,
        base_rate: r.data.base_rate,
        base_kms: r.data.base_kms,
        base_hours: r.data.base_hours,
        extra_km: r.data.extra_km,
        extra_hour: r.data.extra_hour,
        night: r.data.night,
        per_km: r.data.per_km,
        fixed_price: r.data.fixed_price,
        driver_ta: r.data.driver_ta,
        notes: r.data.notes,
      });
    }
    if (rows.length > 0) {
      const { error } = await ctx.admin.from("rate_cards").upsert(rows, {
        onConflict: "company_id,client_id,car_type,mode,plan_name",
      });
      if (error) return { ok: false, error: `Rate-card upsert failed: ${error.message}` };
    }
  }

  revalidatePath("/clients");
  revalidatePath("/vehicles");
  revalidatePath("/rate-cards");
  revalidatePath("/dashboard");

  return {
    ok: true,
    clients: insertedClients,
    vehicles: insertedVehicles,
    rateCards: insertedRateCards,
    rateCardsUpdated: updatedRateCards,
  };
}
