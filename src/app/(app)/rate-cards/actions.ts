"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";
import type { CarType, RateCard, TripMode } from "@/lib/supabase/types";

const CAR_TYPES = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"] as const;
const MODES = ["local", "outstation", "transfer", "package"] as const;

const nullableNumber = z
  .union([z.number(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null || Number.isNaN(v) ? null : Number(v)));

const RateCardSchema = z.object({
  client_id: z.string().uuid("Pick a client."),
  car_type: z.enum(CAR_TYPES),
  mode: z.enum(MODES),
  base_rate:   nullableNumber,
  base_kms:    nullableNumber,
  base_hours:  nullableNumber,
  extra_km:    nullableNumber,
  extra_hour:  nullableNumber,
  night:       nullableNumber,
  per_km:      nullableNumber,
  driver_ta:   nullableNumber,
  plan_name:   z.string().optional().default(""),
  fixed_price: nullableNumber,
  includes_toll:    z.boolean().default(false),
  includes_tax:     z.boolean().default(false),
  includes_parking: z.boolean().default(false),
  notes:       z.string().optional().default(""),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function parse(formData: FormData) {
  const num = (k: string) => {
    const v = formData.get(k);
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const bool = (k: string) => formData.get(k) === "true";
  return RateCardSchema.safeParse({
    client_id: formData.get("client_id"),
    car_type: formData.get("car_type"),
    mode: formData.get("mode"),
    base_rate: num("base_rate"),
    base_kms: num("base_kms"),
    base_hours: num("base_hours"),
    extra_km: num("extra_km"),
    extra_hour: num("extra_hour"),
    night: num("night"),
    per_km: num("per_km"),
    driver_ta: num("driver_ta"),
    plan_name: formData.get("plan_name") ?? "",
    fixed_price: num("fixed_price"),
    includes_toll: bool("includes_toll"),
    includes_tax: bool("includes_tax"),
    includes_parking: bool("includes_parking"),
    notes: formData.get("notes") ?? "",
  });
}

function modeFields(d: z.infer<typeof RateCardSchema>) {
  const isLocal = d.mode === "local";
  const isOutstation = d.mode === "outstation";
  const isFixed = d.mode === "transfer" || d.mode === "package";
  const isPackage = d.mode === "package";
  return {
    base_rate:        isLocal ? d.base_rate  : null,
    base_kms:         isLocal ? d.base_kms   : null,
    base_hours:       isLocal ? d.base_hours : null,
    extra_km:         isLocal ? d.extra_km   : null,
    extra_hour:       isLocal ? d.extra_hour : null,
    night:            isLocal ? d.night      : null,
    per_km:           isOutstation ? d.per_km : null,
    plan_name:        isFixed ? (d.plan_name?.trim() || null) : null,
    fixed_price:      isFixed ? d.fixed_price : null,
    // Inclusion flags only apply to package mode in the UI, but storing
    // them for transfer too costs nothing.
    includes_toll:    isPackage ? d.includes_toll : false,
    includes_tax:     isPackage ? d.includes_tax : false,
    includes_parking: isPackage ? d.includes_parking : false,
    notes:            isFixed ? (d.notes?.trim() || null) : null,
    driver_ta:        d.driver_ta,
  };
}

function validateForMode(d: z.infer<typeof RateCardSchema>): string | null {
  if (d.mode === "transfer" || d.mode === "package") {
    if (!d.plan_name?.trim()) return "Plan name is required.";
    if (d.fixed_price == null || d.fixed_price <= 0) {
      return "Fixed price is required.";
    }
  }
  return null;
}

export async function createRateCardAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const err = validateForMode(parsed.data);
  if (err) return { ok: false, error: err };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin.from("rate_cards").insert({
    company_id: ctx.companyId,
    client_id: parsed.data.client_id,
    car_type: parsed.data.car_type,
    mode: parsed.data.mode,
    ...modeFields(parsed.data),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/rate-cards");
  return { ok: true };
}

export async function updateRateCardAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const err = validateForMode(parsed.data);
  if (err) return { ok: false, error: err };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin
    .from("rate_cards")
    .update({
      client_id: parsed.data.client_id,
      car_type: parsed.data.car_type,
      mode: parsed.data.mode,
      ...modeFields(parsed.data),
    })
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/rate-cards");
  return { ok: true };
}

export type FetchRateCardResult =
  | { ok: true; rateCard: RateCard }
  | { ok: false; error: string };

/** Look up a rate card by its natural key so the inline trip-form flow
 *  can grab the row it just upserted. Plan name disambiguates Transfer
 *  / Package rows where the same (client, car, mode) can have multiple
 *  plans. */
export async function fetchRateCardAction(args: {
  client_id: string;
  car_type: CarType;
  mode: TripMode;
  plan_name?: string | null;
}): Promise<FetchRateCardResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  let q = ctx.admin
    .from("rate_cards")
    .select("*")
    .eq("company_id", ctx.companyId)
    .eq("client_id", args.client_id)
    .eq("car_type", args.car_type)
    .eq("mode", args.mode);
  q = args.plan_name
    ? q.eq("plan_name", args.plan_name)
    : q.is("plan_name", null);

  const { data, error } = await q.maybeSingle<RateCard>();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Rate card not found after save." };
  return { ok: true, rateCard: data };
}

export async function deleteRateCardAction(id: string): Promise<ActionResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin
    .from("rate_cards")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/rate-cards");
  return { ok: true };
}
