"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { buildInvoiceDraft } from "@/lib/invoice-builder";
import type {
  Client,
  Company,
  RateCard,
  Trip,
  Vehicle,
} from "@/lib/supabase/types";

const IssueInvoiceSchema = z.object({
  client_id: z.string().uuid(),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trip_ids: z.array(z.string().uuid()).min(1, "Pick at least one trip."),
  toll_override: z.number().nullable().optional(),
});

export type IssueInvoiceInput = z.input<typeof IssueInvoiceSchema>;

export type IssueInvoiceResult =
  | { ok: true; invoice_id: string; invoice_number: number }
  | { ok: false; error: string };

export async function issueInvoiceAction(
  raw: IssueInvoiceInput,
): Promise<IssueInvoiceResult> {
  const parsed = IssueInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  // Load everything we need for the snapshot + draft.
  const [
    { data: trips, error: tripsErr },
    { data: rateCards, error: ratesErr },
    { data: vehicles, error: vehiclesErr },
    { data: client, error: clientErr },
    { data: company, error: companyErr },
  ] = await Promise.all([
    ctx.admin
      .from("trips")
      .select("*")
      .eq("company_id", ctx.companyId)
      .eq("client_id", data.client_id)
      .in("id", data.trip_ids)
      .returns<Trip[]>(),
    ctx.admin
      .from("rate_cards")
      .select("*")
      .eq("company_id", ctx.companyId)
      .eq("client_id", data.client_id)
      .returns<RateCard[]>(),
    ctx.admin
      .from("vehicles")
      .select("id, number, type")
      .eq("company_id", ctx.companyId)
      .returns<Pick<Vehicle, "id" | "number" | "type">[]>(),
    ctx.admin
      .from("clients")
      .select("*")
      .eq("id", data.client_id)
      .eq("company_id", ctx.companyId)
      .maybeSingle<Client>(),
    ctx.admin
      .from("companies")
      .select("*")
      .eq("id", ctx.companyId)
      .maybeSingle<Company>(),
  ]);

  if (tripsErr) return { ok: false, error: tripsErr.message };
  if (ratesErr) return { ok: false, error: ratesErr.message };
  if (vehiclesErr) return { ok: false, error: vehiclesErr.message };
  if (clientErr) return { ok: false, error: clientErr.message };
  if (companyErr) return { ok: false, error: companyErr.message };

  if (!client) return { ok: false, error: "Client not found." };
  if (!company) return { ok: false, error: "Company not found." };
  if (!trips || trips.length !== data.trip_ids.length) {
    return { ok: false, error: "Some trips were not found." };
  }
  const alreadyInvoiced = trips.find((t) => t.invoiced);
  if (alreadyInvoiced) {
    return { ok: false, error: "One or more trips are already invoiced." };
  }

  const draft = buildInvoiceDraft({
    trips,
    rateCards: rateCards ?? [],
    vehicles: vehicles ?? [],
    client,
    company,
    toll_override: data.toll_override ?? null,
  });

  if (draft.unmatched_trip_ids.length > 0) {
    return {
      ok: false,
      error: `Missing rate card for ${draft.unmatched_trip_ids.length} trip(s). Add rate cards first.`,
    };
  }

  // Atomically reserve the next invoice number for this company. Must run
  // through the user-scoped client so auth.uid() resolves inside the
  // SECURITY DEFINER function, the admin client has no session.
  const userSb = await createUserClient();
  const { data: numberData, error: rpcErr } = await userSb.rpc(
    "allocate_invoice_number",
    { p_company_id: ctx.companyId },
  );
  if (rpcErr) return { ok: false, error: rpcErr.message };
  const invoice_number = Number(numberData);
  if (!Number.isFinite(invoice_number)) {
    return { ok: false, error: "Failed to allocate invoice number." };
  }

  const { data: invoiceRow, error: insertErr } = await ctx.admin
    .from("invoices")
    .insert({
      company_id: ctx.companyId,
      invoice_number,
      invoice_date: data.invoice_date,
      client_id: client.id,
      client_name: client.name,
      client_address: client.address,
      client_gstin: client.gstin,
      client_booked_by: client.default_booked_by,
      period_from: data.period_from,
      period_to: data.period_to,
      subtotal: draft.subtotal,
      gst_mode: draft.gst.mode,
      cgst: draft.gst.cgst,
      sgst: draft.gst.sgst,
      igst: draft.gst.igst,
      toll_total: draft.toll_total,
      toll_label: draft.toll_label,
      net_amount: draft.net_amount,
      amount_in_words: draft.amount_in_words,
      status: "unpaid",
      created_by: ctx.userId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !invoiceRow) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to create invoice.",
    };
  }
  const invoice_id = invoiceRow.id;

  const { error: linesErr } = await ctx.admin.from("invoice_lines").insert(
    draft.lines.map((l) => ({
      invoice_id,
      trip_id: l.trip_id,
      date: l.date,
      vehicle_label: l.vehicle_label,
      hsn_code: l.hsn_code,
      particulars: l.particulars,
      qty: l.qty,
      rate: l.rate,
      amount: l.amount,
      sort_order: l.sort_order,
    })),
  );
  if (linesErr) {
    // Roll back the invoice header so the next attempt can re-allocate.
    await ctx.admin.from("invoices").delete().eq("id", invoice_id);
    return { ok: false, error: `Lines failed: ${linesErr.message}` };
  }

  const { error: updateErr } = await ctx.admin
    .from("trips")
    .update({ invoiced: true, invoice_id })
    .in("id", data.trip_ids)
    .eq("company_id", ctx.companyId);
  if (updateErr) {
    return { ok: false, error: `Trip flag failed: ${updateErr.message}` };
  }

  revalidatePath("/invoices");
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return { ok: true, invoice_id, invoice_number };
}

const MarkPaidSchema = z.object({
  id: z.string().uuid(),
  paid: z.boolean(),
});

export type MarkPaidResult =
  | { ok: true; status: "paid" | "unpaid" }
  | { ok: false; error: string };

export async function markInvoicePaidAction(
  raw: { id: string; paid: boolean },
): Promise<MarkPaidResult> {
  const parsed = MarkPaidSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { data: existing, error: readErr } = await ctx.admin
    .from("invoices")
    .select("status")
    .eq("id", parsed.data.id)
    .eq("company_id", ctx.companyId)
    .maybeSingle<{ status: string }>();
  if (readErr) return { ok: false, error: readErr.message };
  if (!existing) return { ok: false, error: "Invoice not found." };
  if (existing.status === "reversed") {
    return { ok: false, error: "Undone invoices cannot be marked paid." };
  }

  const nextStatus = parsed.data.paid ? "paid" : "unpaid";
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await ctx.admin
    .from("invoices")
    .update({
      status: nextStatus,
      paid_date: parsed.data.paid ? today : null,
    })
    .eq("id", parsed.data.id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${parsed.data.id}`);
  revalidatePath("/dashboard");
  return { ok: true, status: nextStatus };
}

const ReverseSchema = z.object({
  id: z.string().uuid(),
});

export type ReverseInvoiceResult =
  | { ok: true }
  | { ok: false; error: string };

export async function reverseInvoiceAction(
  raw: { id: string },
): Promise<ReverseInvoiceResult> {
  const parsed = ReverseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { data: existing, error: readErr } = await ctx.admin
    .from("invoices")
    .select("status")
    .eq("id", parsed.data.id)
    .eq("company_id", ctx.companyId)
    .maybeSingle<{ status: string }>();
  if (readErr) return { ok: false, error: readErr.message };
  if (!existing) return { ok: false, error: "Invoice not found." };
  if (existing.status === "reversed") {
    return { ok: false, error: "Already undone." };
  }

  const { error: invErr } = await ctx.admin
    .from("invoices")
    .update({ status: "reversed" })
    .eq("id", parsed.data.id)
    .eq("company_id", ctx.companyId);
  if (invErr) return { ok: false, error: invErr.message };

  const { error: tripsErr } = await ctx.admin
    .from("trips")
    .update({ invoiced: false, invoice_id: null })
    .eq("company_id", ctx.companyId)
    .eq("invoice_id", parsed.data.id);
  if (tripsErr) return { ok: false, error: tripsErr.message };

  revalidatePath("/invoices");
  revalidatePath("/trips");
  return { ok: true };
}
