"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";
import type { BulkDraftRow } from "./draft";

/** Per-row TripSchema — same shape as single-trip TripSchema, mirrored here. */
const TripRowSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
      .optional()
      .default(""),
    client_id: z.string().uuid(),
    vehicle_id: z.string().uuid(),
    car_type: z.enum(["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"]),
    mode: z.enum(["local", "outstation"]),
    billing_method: z.enum(["per_km", "slab"]),
    total_kms: z.number().int().min(0),
    total_hours: z.number().min(0),
    night_count: z.number().int().min(0),
    driver_ta: z.number().int().min(0),
    extra_charge_amount: z.number().min(0),
    charge_toll: z.boolean(),
    charge_tax: z.boolean(),
    charge_parking: z.boolean(),
    notes: z.string(),
    duty_slip_no: z.string(),
  })
  .refine(
    (d) => !d.end_date || d.end_date >= d.date,
    { message: "End date must be on or after start date.", path: ["end_date"] },
  );

function parseRow(row: BulkDraftRow) {
  const num = (v: string) => {
    if (!v) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };
  return TripRowSchema.safeParse({
    date: row.date,
    end_date: row.end_date,
    client_id: row.client_id,
    vehicle_id: row.vehicle_id,
    car_type: row.car_type,
    mode: row.mode,
    billing_method: row.mode === "local" ? "slab" : row.billing_method,
    total_kms: num(row.total_kms),
    total_hours: num(row.total_hours),
    night_count: num(row.night_count),
    driver_ta: num(row.driver_ta),
    extra_charge_amount: num(row.extra_charge_amount),
    charge_toll: row.charge_toll,
    charge_tax: row.charge_tax,
    charge_parking: row.charge_parking,
    notes: row.notes,
    duty_slip_no: row.duty_slip_no,
  });
}

export type SaveDraftResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveBulkDraftAction(
  rows: BulkDraftRow[],
): Promise<SaveDraftResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin
    .from("bulk_drafts")
    .upsert(
      {
        company_id: ctx.companyId,
        user_id: ctx.userId,
        rows: rows as unknown as object,
      },
      { onConflict: "company_id,user_id" },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type CommitResult =
  | {
      ok: true;
      saved: number;
      remaining: BulkDraftRow[];
    }
  | { ok: false; error: string };

/**
 * Insert every row that passes validation; leave the rest in the draft.
 * Returns the count saved and the (incomplete) rows still pending.
 */
export async function commitBulkRowsAction(
  rows: BulkDraftRow[],
): Promise<CommitResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const ready: { row: BulkDraftRow; parsed: z.infer<typeof TripRowSchema> }[] = [];
  const remaining: BulkDraftRow[] = [];

  for (const row of rows) {
    const r = parseRow(row);
    if (r.success) ready.push({ row, parsed: r.data });
    else remaining.push(row);
  }

  if (ready.length === 0) {
    return { ok: true, saved: 0, remaining };
  }

  const inserts = ready.map(({ parsed }) => {
    const isLocal = parsed.mode === "local";
    return {
      company_id: ctx.companyId,
      client_id: parsed.client_id,
      vehicle_id: parsed.vehicle_id,
      date: parsed.date,
      end_date: parsed.end_date || null,
      car_type: parsed.car_type,
      mode: parsed.mode,
      billing_method: isLocal ? "slab" : parsed.billing_method,
      total_kms: parsed.total_kms,
      total_hours: isLocal ? parsed.total_hours : 0,
      night: isLocal ? parsed.night_count > 0 : false,
      night_count: isLocal ? parsed.night_count : 0,
      driver_ta: parsed.driver_ta,
      extra_charge_amount: parsed.extra_charge_amount,
      charge_toll: parsed.charge_toll,
      charge_tax: parsed.charge_tax,
      charge_parking: parsed.charge_parking,
      notes: parsed.notes || null,
      duty_slip_no: parsed.duty_slip_no || null,
      created_by: ctx.userId,
    };
  });

  const { error: insertErr } = await ctx.admin.from("trips").insert(inserts);
  if (insertErr) return { ok: false, error: insertErr.message };

  // Update the draft to only the leftovers (or delete if empty).
  if (remaining.length === 0) {
    const { error: delErr } = await ctx.admin
      .from("bulk_drafts")
      .delete()
      .eq("company_id", ctx.companyId)
      .eq("user_id", ctx.userId);
    if (delErr) {
      // Non-fatal — the trips already saved.
      console.warn(`[bulk-draft] delete after commit failed: ${delErr.message}`);
    }
  } else {
    const { error: updErr } = await ctx.admin
      .from("bulk_drafts")
      .upsert(
        {
          company_id: ctx.companyId,
          user_id: ctx.userId,
          rows: remaining as unknown as object,
        },
        { onConflict: "company_id,user_id" },
      );
    if (updErr) {
      console.warn(`[bulk-draft] update after commit failed: ${updErr.message}`);
    }
  }

  revalidatePath("/trips");
  revalidatePath("/trips/bulk");
  revalidatePath("/");
  return { ok: true, saved: ready.length, remaining };
}

export async function discardBulkDraftAction(): Promise<SaveDraftResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin
    .from("bulk_drafts")
    .delete()
    .eq("company_id", ctx.companyId)
    .eq("user_id", ctx.userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/trips/bulk");
  return { ok: true };
}
