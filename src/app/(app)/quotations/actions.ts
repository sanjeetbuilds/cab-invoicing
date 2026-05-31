"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";
import { createClient as createUserClient } from "@/lib/supabase/server";
import type { QuotationStatus } from "@/lib/supabase/types";

const CAR_TYPES = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"] as const;
const MODES = ["local", "outstation"] as const;
const STATUSES: QuotationStatus[] = [
  "draft",
  "sent",
  "accepted",
  "expired",
  "rejected",
];

const LineSchema = z.object({
  car_type: z.enum(CAR_TYPES),
  mode: z.enum(MODES),
  base_rate: z.number().nullable().optional(),
  base_kms: z.number().int().nullable().optional(),
  base_hours: z.number().int().nullable().optional(),
  extra_km: z.number().nullable().optional(),
  extra_hour: z.number().nullable().optional(),
  night: z.number().nullable().optional(),
  per_km: z.number().nullable().optional(),
  driver_ta: z.number().nullable().optional(),
});

const QuotationSchema = z.object({
  number: z.string().min(1, "Number is required."),
  client_id: z.string().uuid().nullable().optional(),
  client_name: z.string().optional().default(""),
  client_address: z.string().optional().default(""),
  client_gstin: z.string().optional().default(""),
  client_contact: z.string().optional().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  valid_until: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
    .optional()
    .default(""),
  status: z.enum(STATUSES).default("draft"),
  notes: z.string().optional().default(""),
  lines: z.array(LineSchema).min(1, "Add at least one rate line."),
});

export type QuotationInput = z.input<typeof QuotationSchema>;

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type SimpleResult = { ok: true } | { ok: false; error: string };

function snapshotPayload(d: z.infer<typeof QuotationSchema>) {
  return {
    number: d.number,
    client_id: d.client_id ?? null,
    client_name: d.client_name || null,
    client_address: d.client_address || null,
    client_gstin: d.client_gstin || null,
    client_contact: d.client_contact || null,
    date: d.date,
    valid_until: d.valid_until || null,
    status: d.status,
    notes: d.notes || null,
  };
}

export async function createQuotationAction(
  raw: QuotationInput,
): Promise<ActionResult> {
  const parsed = QuotationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  // The form passes number = "" or already-formatted. If empty, allocate.
  let number = parsed.data.number?.trim();
  if (!number) {
    const userSb = await createUserClient();
    const { data: alloc, error: rpcErr } = await userSb.rpc(
      "allocate_quotation_number",
      { p_company_id: ctx.companyId },
    );
    if (rpcErr) return { ok: false, error: rpcErr.message };
    // Combine with prefix
    const { data: company } = await ctx.admin
      .from("companies")
      .select("quotation_prefix")
      .eq("id", ctx.companyId)
      .maybeSingle<{ quotation_prefix: string | null }>();
    const prefix = company?.quotation_prefix ?? "";
    number = `${prefix}${alloc}`;
  }

  const payload = { ...snapshotPayload(parsed.data), number };

  const { data: row, error: insertErr } = await ctx.admin
    .from("quotations")
    .insert({
      company_id: ctx.companyId,
      ...payload,
      created_by: ctx.userId,
    })
    .select("id")
    .single<{ id: string }>();
  if (insertErr || !row) {
    return { ok: false, error: insertErr?.message ?? "Failed to create." };
  }

  const lineRows = parsed.data.lines.map((l, i) => ({
    quotation_id: row.id,
    car_type: l.car_type,
    mode: l.mode,
    base_rate: l.base_rate ?? null,
    base_kms: l.base_kms ?? null,
    base_hours: l.base_hours ?? null,
    extra_km: l.extra_km ?? null,
    extra_hour: l.extra_hour ?? null,
    night: l.night ?? null,
    per_km: l.per_km ?? null,
    driver_ta: l.driver_ta ?? null,
    sort_order: i,
  }));
  const { error: linesErr } = await ctx.admin
    .from("quotation_lines")
    .insert(lineRows);
  if (linesErr) {
    await ctx.admin.from("quotations").delete().eq("id", row.id);
    return { ok: false, error: `Lines failed: ${linesErr.message}` };
  }

  revalidatePath("/quotations");
  return { ok: true, id: row.id };
}

export async function updateQuotationAction(
  id: string,
  raw: QuotationInput,
): Promise<ActionResult> {
  const parsed = QuotationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error: updErr } = await ctx.admin
    .from("quotations")
    .update(snapshotPayload(parsed.data))
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (updErr) return { ok: false, error: updErr.message };

  // Replace lines (simpler than diffing).
  await ctx.admin.from("quotation_lines").delete().eq("quotation_id", id);
  const lineRows = parsed.data.lines.map((l, i) => ({
    quotation_id: id,
    car_type: l.car_type,
    mode: l.mode,
    base_rate: l.base_rate ?? null,
    base_kms: l.base_kms ?? null,
    base_hours: l.base_hours ?? null,
    extra_km: l.extra_km ?? null,
    extra_hour: l.extra_hour ?? null,
    night: l.night ?? null,
    per_km: l.per_km ?? null,
    driver_ta: l.driver_ta ?? null,
    sort_order: i,
  }));
  const { error: linesErr } = await ctx.admin
    .from("quotation_lines")
    .insert(lineRows);
  if (linesErr) return { ok: false, error: `Lines failed: ${linesErr.message}` };

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
  return { ok: true, id };
}

export async function deleteQuotationAction(id: string): Promise<SimpleResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  const { error } = await ctx.admin
    .from("quotations")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/quotations");
  return { ok: true };
}

/**
 * Accept the quotation: create the client if it's snapshot-only, then
 * upsert one rate_card per line, then stamp the quotation as accepted.
 */
export async function acceptQuotationAction(id: string): Promise<SimpleResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { data: q, error: qErr } = await ctx.admin
    .from("quotations")
    .select("*")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .maybeSingle();
  if (qErr) return { ok: false, error: qErr.message };
  if (!q) return { ok: false, error: "Quotation not found." };
  if (q.status === "accepted") {
    return { ok: false, error: "Already accepted." };
  }

  // Ensure we have a client_id; create one from the snapshot if missing.
  let clientId: string | null = q.client_id ?? null;
  if (!clientId) {
    if (!q.client_name) {
      return {
        ok: false,
        error: "No linked client and no client name on the quotation.",
      };
    }
    const { data: company } = await ctx.admin
      .from("companies")
      .select("state")
      .eq("id", ctx.companyId)
      .maybeSingle<{ state: string }>();
    const { data: newClient, error: cErr } = await ctx.admin
      .from("clients")
      .insert({
        company_id: ctx.companyId,
        name: q.client_name,
        gstin: q.client_gstin ?? null,
        address: q.client_address ?? null,
        default_booked_by: q.client_contact ?? null,
        state: company?.state ?? "Haryana",
      })
      .select("id")
      .single<{ id: string }>();
    if (cErr || !newClient) {
      return { ok: false, error: cErr?.message ?? "Couldn't create client." };
    }
    clientId = newClient.id;

    await ctx.admin
      .from("quotations")
      .update({ client_id: clientId })
      .eq("id", id);
  }

  const { data: lines } = await ctx.admin
    .from("quotation_lines")
    .select("*")
    .eq("quotation_id", id)
    .order("sort_order", { ascending: true });

  // ON CONFLICT must match the rate_cards unique constraint exactly —
  // (company_id, client_id, car_type, mode, plan_name). plan_name is
  // included so Transfer / Package plans (Airport T3, NDLS, …) dedupe
  // per-plan rather than collapsing onto a single (client, car, mode).
  for (const l of lines ?? []) {
    const isLocal = l.mode === "local";
    const isOutstation = l.mode === "outstation";
    const isFixed = l.mode === "transfer" || l.mode === "package";
    const { error: rcErr } = await ctx.admin
      .from("rate_cards")
      .upsert(
        {
          company_id: ctx.companyId,
          client_id: clientId,
          car_type: l.car_type,
          mode: l.mode,
          plan_name: isFixed ? l.plan_name : null,
          base_rate: isLocal ? l.base_rate : null,
          base_kms: isLocal ? l.base_kms : null,
          base_hours: isLocal ? l.base_hours : null,
          extra_km: isLocal ? l.extra_km : null,
          extra_hour: isLocal ? l.extra_hour : null,
          night: isLocal ? l.night : null,
          per_km: isOutstation ? l.per_km : null,
          fixed_price: isFixed ? l.fixed_price : null,
          includes_toll: isFixed ? l.includes_toll : false,
          includes_tax: isFixed ? l.includes_tax : false,
          includes_parking: isFixed ? l.includes_parking : false,
          driver_ta: l.driver_ta,
          source_quotation_id: id,
          active_from: new Date().toISOString().slice(0, 10),
        },
        { onConflict: "company_id,client_id,car_type,mode,plan_name" },
      );
    if (rcErr) {
      return {
        ok: false,
        error: `Couldn't create rate card for ${l.car_type} · ${l.mode}: ${rcErr.message}`,
      };
    }
  }

  await ctx.admin
    .from("quotations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
  revalidatePath("/rate-cards");
  return { ok: true };
}
