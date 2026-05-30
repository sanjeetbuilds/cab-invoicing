"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";

const CAR_TYPES = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"] as const;
const MODES = ["local", "outstation", "transfer", "package"] as const;
const BILLING_METHODS = ["per_km", "slab"] as const;

const TripSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    end_date: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
      .optional()
      .default(""),
    client_id: z.string().uuid("Pick a client."),
    vehicle_id: z.string().uuid("Pick a vehicle."),
    car_type: z.enum(CAR_TYPES),
    mode: z.enum(MODES),
    plan_name: z.string().optional().default(""),
    billing_method: z.enum(BILLING_METHODS).default("per_km"),
    total_kms: z.number().int().min(0),
    total_hours: z.number().min(0).default(0),
    night_count: z.number().int().min(0).default(0),
    driver_ta: z.number().int().min(0).default(0),
    extra_charge_amount: z.number().min(0).default(0),
    charge_toll: z.boolean().default(false),
    charge_tax: z.boolean().default(false),
    charge_parking: z.boolean().default(false),
    notes: z.string().optional().default(""),
    duty_slip_no: z.string().optional().default(""),
  })
  .refine(
    (d) => !d.end_date || d.end_date >= d.date,
    { message: "End date must be on or after the start date.", path: ["end_date"] },
  )
  .refine(
    (d) =>
      d.mode === "transfer" || d.mode === "package"
        ? Boolean(d.plan_name && d.plan_name.trim())
        : true,
    { message: "Pick a plan for this trip.", path: ["plan_name"] },
  );

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
    end_date: formData.get("end_date") ?? "",
    client_id: formData.get("client_id"),
    vehicle_id: formData.get("vehicle_id"),
    car_type: formData.get("car_type"),
    mode: formData.get("mode"),
    plan_name: formData.get("plan_name") ?? "",
    billing_method: formData.get("billing_method") ?? "per_km",
    total_kms: num("total_kms"),
    total_hours: num("total_hours"),
    night_count: num("night_count"),
    driver_ta: num("driver_ta"),
    extra_charge_amount: num("extra_charge_amount"),
    charge_toll: formData.get("charge_toll") === "true",
    charge_tax: formData.get("charge_tax") === "true",
    charge_parking: formData.get("charge_parking") === "true",
    notes: formData.get("notes") ?? "",
    duty_slip_no: formData.get("duty_slip_no") ?? "",
  });
}

function payload(d: z.infer<typeof TripSchema>) {
  const isLocal = d.mode === "local";
  const isFixed = d.mode === "transfer" || d.mode === "package";
  // Local + fixed-price are always slab; outstation honors the form choice.
  const billing_method = isLocal || isFixed ? "slab" : d.billing_method;
  return {
    client_id: d.client_id,
    vehicle_id: d.vehicle_id,
    date: d.date,
    end_date: d.end_date || null,
    car_type: d.car_type,
    mode: d.mode,
    plan_name: isFixed ? (d.plan_name?.trim() || null) : null,
    billing_method,
    total_kms: d.total_kms,
    total_hours: isLocal ? d.total_hours : 0,
    night: isLocal ? d.night_count > 0 : false,
    night_count: isLocal ? d.night_count : 0,
    driver_ta: d.driver_ta,
    extra_charge_amount: d.extra_charge_amount,
    charge_toll: d.charge_toll,
    charge_tax: d.charge_tax,
    charge_parking: d.charge_parking,
    notes: d.notes || null,
    duty_slip_no: d.duty_slip_no || null,
  };
}

export async function createTripAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin.from("trips").insert({
    company_id: ctx.companyId,
    ...payload(parsed.data),
    created_by: ctx.userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/trips");
  revalidatePath("/dashboard");
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

  const { error } = await ctx.admin
    .from("trips")
    .update(payload(parsed.data))
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/trips");
  revalidatePath("/dashboard");
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
  revalidatePath("/dashboard");
  return { ok: true };
}
