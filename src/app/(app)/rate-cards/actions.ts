"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";

const CAR_TYPES = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"] as const;
const MODES = ["local", "outstation"] as const;

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
  });
}

export async function createRateCardAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const isLocal = parsed.data.mode === "local";

  const { error } = await ctx.admin.from("rate_cards").insert({
    company_id: ctx.companyId,
    client_id: parsed.data.client_id,
    car_type: parsed.data.car_type,
    mode: parsed.data.mode,
    base_rate:  isLocal ? parsed.data.base_rate  : null,
    base_kms:   isLocal ? parsed.data.base_kms   : null,
    base_hours: isLocal ? parsed.data.base_hours : null,
    extra_km:   isLocal ? parsed.data.extra_km   : null,
    extra_hour: isLocal ? parsed.data.extra_hour : null,
    night:      isLocal ? parsed.data.night      : null,
    per_km:     !isLocal ? parsed.data.per_km    : null,
    driver_ta:  parsed.data.driver_ta,
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

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const isLocal = parsed.data.mode === "local";

  const { error } = await ctx.admin
    .from("rate_cards")
    .update({
      client_id: parsed.data.client_id,
      car_type: parsed.data.car_type,
      mode: parsed.data.mode,
      base_rate:  isLocal ? parsed.data.base_rate  : null,
      base_kms:   isLocal ? parsed.data.base_kms   : null,
      base_hours: isLocal ? parsed.data.base_hours : null,
      extra_km:   isLocal ? parsed.data.extra_km   : null,
      extra_hour: isLocal ? parsed.data.extra_hour : null,
      night:      isLocal ? parsed.data.night      : null,
      per_km:     !isLocal ? parsed.data.per_km    : null,
      driver_ta:  parsed.data.driver_ta,
    })
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/rate-cards");
  return { ok: true };
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
