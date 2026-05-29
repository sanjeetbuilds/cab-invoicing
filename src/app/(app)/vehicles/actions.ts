"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";
import type { Vehicle } from "@/lib/supabase/types";

const CAR_TYPES = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"] as const;
const OWNERSHIP = ["own", "attached"] as const;

const VehicleSchema = z.object({
  number: z.string().min(1, "Vehicle number is required."),
  type: z.enum(CAR_TYPES, { message: "Pick a vehicle type." }),
  ownership: z.enum(OWNERSHIP, { message: "Pick ownership." }),
  vendor_name: z.string().optional().default(""),
  active: z.boolean().default(true),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function parse(formData: FormData) {
  return VehicleSchema.safeParse({
    number: formData.get("number"),
    type: formData.get("type"),
    ownership: formData.get("ownership"),
    vendor_name: formData.get("vendor_name") ?? "",
    active: formData.get("active") === "true",
  });
}

export async function createVehicleAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin.from("vehicles").insert({
    company_id: ctx.companyId,
    number: parsed.data.number,
    type: parsed.data.type,
    ownership: parsed.data.ownership,
    vendor_name:
      parsed.data.ownership === "attached" ? parsed.data.vendor_name || null : null,
    active: parsed.data.active,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/vehicles");
  return { ok: true };
}

export async function updateVehicleAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin
    .from("vehicles")
    .update({
      number: parsed.data.number,
      type: parsed.data.type,
      ownership: parsed.data.ownership,
      vendor_name:
        parsed.data.ownership === "attached" ? parsed.data.vendor_name || null : null,
      active: parsed.data.active,
    })
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/vehicles");
  return { ok: true };
}

export type FetchVehicleResult =
  | { ok: true; vehicle: Pick<Vehicle, "id" | "number" | "type" | "active"> }
  | { ok: false; error: string };

/** Look up a vehicle by its (normalized) number so the inline trip-form
 *  flow can grab the newly-created row to select it. */
export async function fetchVehicleByNumberAction(
  number: string,
): Promise<FetchVehicleResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.admin
    .from("vehicles")
    .select("id, number, type, active")
    .eq("company_id", ctx.companyId)
    .eq("number", number)
    .maybeSingle<Pick<Vehicle, "id" | "number" | "type" | "active">>();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Vehicle not found after save." };
  return { ok: true, vehicle: data };
}

export async function deleteVehicleAction(id: string): Promise<ActionResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin
    .from("vehicles")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/vehicles");
  return { ok: true };
}
