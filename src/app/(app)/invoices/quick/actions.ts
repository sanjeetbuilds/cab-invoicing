"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { INDIA_STATES } from "@/lib/india-states";
import { gstFor } from "@/lib/gst";
import { numberToWords } from "@/lib/number-to-words";
import { chargeLabel } from "@/lib/charges";
import { tripToLines, tripTotal } from "@/lib/trip-lines";
import type {
  Client,
  Company,
  RateCard,
} from "@/lib/supabase/types";

const CAR_TYPES = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"] as const;
const MODES = ["local", "outstation", "transfer", "package"] as const;

const QuickInvoiceSchema = z
  .object({
    customer: z.object({
      name: z.string().min(1, "Customer name is required."),
      phone: z.string().optional().default(""),
      email: z.string().optional().default(""),
      gstin: z.string().optional().default(""),
      address: z.string().optional().default(""),
      state: z.enum(INDIA_STATES as unknown as [string, ...string[]], {
        message: "Pick a state.",
      }),
      is_rcm: z.boolean().default(false),
      /** If provided, reuse this existing quick customer (no INSERT). */
      existing_client_id: z.string().uuid().nullable().optional(),
    }),
    trip: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end_date: z
        .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
        .optional()
        .default(""),
      vehicle_id: z.string().uuid("Pick a vehicle."),
      car_type: z.enum(CAR_TYPES),
      mode: z.enum(MODES),
      plan_name: z.string().optional().default(""),
      total_kms: z.number().min(0).default(0),
      total_hours: z.number().min(0).default(0),
      night_count: z.number().int().min(0).default(0),
      driver_ta: z.number().int().min(0).default(0),
      // Rate fields — typed directly, no rate-card lookup.
      base_rate: z.number().nullable().optional(),
      base_kms: z.number().nullable().optional(),
      base_hours: z.number().nullable().optional(),
      extra_km: z.number().nullable().optional(),
      extra_hour: z.number().nullable().optional(),
      night: z.number().nullable().optional(),
      per_km: z.number().nullable().optional(),
      fixed_price: z.number().nullable().optional(),
      driver_ta_rate: z.number().nullable().optional(),
      // Package inclusion flags — purely informational at this stage.
      includes_toll: z.boolean().default(false),
      includes_tax: z.boolean().default(false),
      includes_parking: z.boolean().default(false),
      notes: z.string().optional().default(""),
    }),
    extras: z.object({
      amount: z.number().min(0).default(0),
      charge_toll: z.boolean().default(false),
      charge_tax: z.boolean().default(false),
      charge_parking: z.boolean().default(false),
    }),
  })
  .refine(
    (d) =>
      d.trip.mode === "transfer" || d.trip.mode === "package"
        ? Boolean(d.trip.plan_name && d.trip.plan_name.trim())
        : true,
    { message: "Plan name is required for transfer / package trips.", path: ["trip", "plan_name"] },
  );

export type QuickInvoiceInput = z.input<typeof QuickInvoiceSchema>;

export type QuickInvoiceResult =
  | { ok: true; invoice_id: string; invoice_number: number; client_id: string }
  | { ok: false; error: string };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build a synthetic RateCard-shaped object from the rates the user typed.
 * tripToLines doesn't care that it's not persisted — only that the
 * fields it reads are present.
 */
function syntheticRateCard(
  trip: z.infer<typeof QuickInvoiceSchema>["trip"],
): RateCard {
  return {
    id: "synthetic",
    company_id: "synthetic",
    client_id: "synthetic",
    car_type: trip.car_type,
    mode: trip.mode,
    base_rate: trip.base_rate ?? null,
    base_kms: trip.base_kms ?? null,
    base_hours: trip.base_hours ?? null,
    extra_km: trip.extra_km ?? null,
    extra_hour: trip.extra_hour ?? null,
    night: trip.night ?? null,
    per_km: trip.per_km ?? null,
    plan_name: trip.plan_name?.trim() || null,
    fixed_price: trip.fixed_price ?? null,
    includes_toll: trip.includes_toll,
    includes_tax: trip.includes_tax,
    includes_parking: trip.includes_parking,
    notes: trip.notes?.trim() || null,
    driver_ta: trip.driver_ta_rate ?? null,
    source_quotation_id: null,
    active_from: trip.date,
    created_at: trip.date,
    updated_at: trip.date,
  };
}

export async function issueQuickInvoiceAction(
  raw: QuickInvoiceInput,
): Promise<QuickInvoiceResult> {
  const parsed = QuickInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  // Load company + the vehicle so we have what the snapshot needs.
  const [{ data: company, error: companyErr }, { data: vehicle }] =
    await Promise.all([
      ctx.admin
        .from("companies")
        .select("*")
        .eq("id", ctx.companyId)
        .maybeSingle<Company>(),
      ctx.admin
        .from("vehicles")
        .select("id, number, type")
        .eq("id", data.trip.vehicle_id)
        .eq("company_id", ctx.companyId)
        .maybeSingle<{ id: string; number: string; type: string }>(),
    ]);
  if (companyErr) return { ok: false, error: companyErr.message };
  if (!company) return { ok: false, error: "Company not found." };
  if (!vehicle) return { ok: false, error: "Vehicle not found." };

  // 1) Resolve / create the quick customer.
  let clientId = data.customer.existing_client_id ?? null;
  if (!clientId) {
    const { data: row, error: cErr } = await ctx.admin
      .from("clients")
      .insert({
        company_id: ctx.companyId,
        name: data.customer.name,
        gstin: data.customer.gstin || null,
        address: data.customer.address || null,
        state: data.customer.state,
        is_rcm: data.customer.is_rcm,
        is_quick_customer: true,
        default_booked_by: data.customer.phone
          ? `${data.customer.phone}${data.customer.email ? ` · ${data.customer.email}` : ""}`
          : (data.customer.email || null),
        notes: null,
      })
      .select("id")
      .single<{ id: string }>();
    if (cErr || !row) {
      return {
        ok: false,
        error: cErr?.message ?? "Failed to create customer.",
      };
    }
    clientId = row.id;
  }

  // 2) Compute lines from typed rates.
  const rate = syntheticRateCard(data.trip);
  const isFixed = data.trip.mode === "transfer" || data.trip.mode === "package";
  const billing_method: "slab" | "per_km" =
    data.trip.mode === "local"
      ? "slab"
      : data.trip.mode === "outstation"
        ? "per_km"
        : "slab"; // unused for fixed-price
  const lines = tripToLines(
    {
      car_type: data.trip.car_type,
      mode: data.trip.mode,
      billing_method,
      total_kms: data.trip.total_kms,
      total_hours: data.trip.total_hours,
      night: data.trip.night_count > 0,
      night_count: data.trip.night_count,
      driver_ta: data.trip.driver_ta,
    },
    rate,
  );
  const subtotal = round2(tripTotal(lines));
  if (subtotal <= 0) {
    return { ok: false, error: "Total amount must be greater than zero." };
  }

  const gst = gstFor(
    { state: data.customer.state, is_rcm: data.customer.is_rcm },
    subtotal,
    company,
  );
  const tollLabel = chargeLabel(
    {
      toll: data.extras.charge_toll,
      tax: data.extras.charge_tax,
      parking: data.extras.charge_parking,
    },
    data.extras.amount,
  );
  const toll_total = round2(data.extras.amount);
  const net_amount = round2(
    subtotal + gst.cgst + gst.sgst + gst.igst + toll_total,
  );
  const amount_in_words = `${numberToWords(Math.round(net_amount))} Only.`;

  // 3) Create trip first so we can attach invoice_id to it.
  const { data: tripRow, error: tripErr } = await ctx.admin
    .from("trips")
    .insert({
      company_id: ctx.companyId,
      client_id: clientId,
      vehicle_id: data.trip.vehicle_id,
      date: data.trip.date,
      end_date: data.trip.end_date || null,
      car_type: data.trip.car_type,
      mode: data.trip.mode,
      plan_name: isFixed ? (data.trip.plan_name?.trim() || null) : null,
      billing_method,
      total_kms: data.trip.total_kms,
      total_hours: data.trip.mode === "local" ? data.trip.total_hours : 0,
      night: data.trip.night_count > 0,
      night_count: data.trip.night_count,
      driver_ta: data.trip.driver_ta,
      extra_charge_amount: data.extras.amount,
      charge_toll: data.extras.charge_toll,
      charge_tax: data.extras.charge_tax,
      charge_parking: data.extras.charge_parking,
      notes: data.trip.notes || null,
      duty_slip_no: null,
      invoiced: false,
      created_by: ctx.userId,
    })
    .select("id")
    .single<{ id: string }>();
  if (tripErr || !tripRow) {
    return {
      ok: false,
      error: tripErr?.message ?? "Failed to create trip.",
    };
  }

  // 4) Allocate invoice number (user-scoped RPC; SECURITY DEFINER needs auth.uid()).
  const userSb = await createUserClient();
  const { data: numberData, error: rpcErr } = await userSb.rpc(
    "allocate_invoice_number",
    { p_company_id: ctx.companyId },
  );
  if (rpcErr) {
    // Roll back the trip — easier than holding the gap.
    await ctx.admin.from("trips").delete().eq("id", tripRow.id);
    return { ok: false, error: rpcErr.message };
  }
  const invoice_number = Number(numberData);

  // 5) Create the invoice header + lines snapshot.
  const { data: invoiceRow, error: invErr } = await ctx.admin
    .from("invoices")
    .insert({
      company_id: ctx.companyId,
      invoice_number,
      invoice_date: data.trip.date,
      client_id: clientId,
      client_name: data.customer.name,
      client_address: data.customer.address || null,
      client_gstin: data.customer.gstin || null,
      client_booked_by: null,
      period_from: data.trip.date,
      period_to: data.trip.end_date || data.trip.date,
      subtotal,
      gst_mode: gst.mode,
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
      toll_total,
      toll_label: toll_total > 0 ? tollLabel : null,
      net_amount,
      amount_in_words,
      status: "unpaid",
      created_by: ctx.userId,
    })
    .select("id")
    .single<{ id: string }>();
  if (invErr || !invoiceRow) {
    await ctx.admin.from("trips").delete().eq("id", tripRow.id);
    return {
      ok: false,
      error: invErr?.message ?? "Failed to create invoice.",
    };
  }

  const vehicleLabel = (() => {
    const parts = vehicle.number.trim().split(/\s+/);
    const last = parts[parts.length - 1] ?? vehicle.number;
    return `${last} ${data.trip.car_type}`;
  })();
  const fmtDateRange = (start: string, end: string | null) => {
    const f = (iso: string) => {
      const [y, m, d] = iso.split("-");
      return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
    };
    if (!end || end === start) return f(start);
    return `${f(start)}\nto\n${f(end)}`;
  };

  const { error: linesErr } = await ctx.admin.from("invoice_lines").insert(
    lines.map((l, i) => ({
      invoice_id: invoiceRow.id,
      trip_id: tripRow.id,
      date: fmtDateRange(data.trip.date, data.trip.end_date || null),
      vehicle_label: vehicleLabel,
      hsn_code: "996601",
      particulars: l.particulars,
      qty: l.qty,
      rate: l.rate,
      amount: l.amount,
      sort_order: i,
    })),
  );
  if (linesErr) {
    await ctx.admin.from("invoices").delete().eq("id", invoiceRow.id);
    await ctx.admin.from("trips").delete().eq("id", tripRow.id);
    return { ok: false, error: `Lines failed: ${linesErr.message}` };
  }

  // 6) Mark trip invoiced.
  const { error: updateErr } = await ctx.admin
    .from("trips")
    .update({ invoiced: true, invoice_id: invoiceRow.id })
    .eq("id", tripRow.id);
  if (updateErr) {
    return { ok: false, error: `Trip flag failed: ${updateErr.message}` };
  }

  revalidatePath("/invoices");
  revalidatePath("/trips");
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return {
    ok: true,
    invoice_id: invoiceRow.id,
    invoice_number,
    client_id: clientId,
  };
}

export type QuickCustomerLite = Pick<
  Client,
  | "id"
  | "name"
  | "state"
  | "gstin"
  | "address"
  | "is_rcm"
  | "default_booked_by"
>;
