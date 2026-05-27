"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";

const CAR_TYPES = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"] as const;
const MODES = ["local", "outstation"] as const;

const TripSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  client_id: z.string().uuid("Pick a client."),
  vehicle_id: z.string().uuid("Pick a vehicle."),
  car_type: z.enum(CAR_TYPES),
  mode: z.enum(MODES),
  total_kms: z.number().int().min(0),
  total_hours: z.number().min(0).default(0),
  night: z.boolean().default(false),
  driver_ta: z.number().int().min(0).default(0),
  toll: z.number().min(0).default(0),
  notes: z.string().optional().default(""),
  duty_slip_no: z.string().optional().default(""),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function parse(formData: FormData) {
  const num = (k: string, fallback = 0) => {
    const v = formData.get(k);
    if (v === null || v === "") return fallback;
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  };
  return TripSchema.safeParse({
    date: formData.get("date"),
    client_id: formData.get("client_id"),
    vehicle_id: formData.get("vehicle_id"),
    car_type: formData.get("car_type"),
    mode: formData.get("mode"),
    total_kms: num("total_kms"),
    total_hours: num("total_hours"),
    night: formData.get("night") === "true",
    driver_ta: num("driver_ta"),
    toll: num("toll"),
    notes: formData.get("notes") ?? "",
    duty_slip_no: formData.get("duty_slip_no") ?? "",
  });
}

export async function createTripAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const isLocal = parsed.data.mode === "local";

  const { error } = await ctx.admin.from("trips").insert({
    company_id: ctx.companyId,
    client_id: parsed.data.client_id,
    vehicle_id: parsed.data.vehicle_id,
    date: parsed.data.date,
    car_type: parsed.data.car_type,
    mode: parsed.data.mode,
    total_kms: parsed.data.total_kms,
    total_hours: isLocal ? parsed.data.total_hours : 0,
    night: isLocal ? parsed.data.night : false,
    driver_ta: parsed.data.driver_ta,
    toll: parsed.data.toll,
    notes: parsed.data.notes || null,
    duty_slip_no: parsed.data.duty_slip_no || null,
    created_by: ctx.userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/trips");
  revalidatePath("/");
  return { ok: true };
}

export async function updateTripAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { data: existing, error: readErr } = await ctx.admin
    .from("trips")
    .select("invoiced")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .maybeSingle<{ invoiced: boolean }>();
  if (readErr) return { ok: false, error: readErr.message };
  if (!existing) return { ok: false, error: "Trip not found." };
  if (existing.invoiced) {
    return { ok: false, error: "Trip is invoiced — reverse the invoice first." };
  }

  const isLocal = parsed.data.mode === "local";

  const { error } = await ctx.admin
    .from("trips")
    .update({
      client_id: parsed.data.client_id,
      vehicle_id: parsed.data.vehicle_id,
      date: parsed.data.date,
      car_type: parsed.data.car_type,
      mode: parsed.data.mode,
      total_kms: parsed.data.total_kms,
      total_hours: isLocal ? parsed.data.total_hours : 0,
      night: isLocal ? parsed.data.night : false,
      driver_ta: parsed.data.driver_ta,
      toll: parsed.data.toll,
      notes: parsed.data.notes || null,
      duty_slip_no: parsed.data.duty_slip_no || null,
    })
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/trips");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTripAction(id: string): Promise<ActionResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { data: existing, error: readErr } = await ctx.admin
    .from("trips")
    .select("invoiced")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .maybeSingle<{ invoiced: boolean }>();
  if (readErr) return { ok: false, error: readErr.message };
  if (!existing) return { ok: false, error: "Trip not found." };
  if (existing.invoiced) {
    return { ok: false, error: "Trip is invoiced — reverse the invoice first." };
  }

  const { error } = await ctx.admin
    .from("trips")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/trips");
  revalidatePath("/");
  return { ok: true };
}
