"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";
import { INDIA_STATES } from "@/lib/india-states";

const ClientSchema = z.object({
  name: z.string().min(1, "Name is required."),
  state: z.enum(INDIA_STATES as unknown as [string, ...string[]], {
    message: "Pick a state.",
  }),
  gstin: z.string().optional().default(""),
  address: z.string().optional().default(""),
  default_booked_by: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  is_rcm: z.boolean().default(false),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function parse(formData: FormData) {
  return ClientSchema.safeParse({
    name: formData.get("name"),
    state: formData.get("state"),
    gstin: formData.get("gstin") ?? "",
    address: formData.get("address") ?? "",
    default_booked_by: formData.get("default_booked_by") ?? "",
    notes: formData.get("notes") ?? "",
    is_rcm: formData.get("is_rcm") === "true",
  });
}

export async function createClientAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin.from("clients").insert({
    company_id: ctx.companyId,
    name: parsed.data.name,
    state: parsed.data.state,
    gstin: parsed.data.gstin || null,
    address: parsed.data.address || null,
    default_booked_by: parsed.data.default_booked_by || null,
    notes: parsed.data.notes || null,
    is_rcm: parsed.data.is_rcm,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  return { ok: true };
}

export async function updateClientAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin
    .from("clients")
    .update({
      name: parsed.data.name,
      state: parsed.data.state,
      gstin: parsed.data.gstin || null,
      address: parsed.data.address || null,
      default_booked_by: parsed.data.default_booked_by || null,
      notes: parsed.data.notes || null,
      is_rcm: parsed.data.is_rcm,
    })
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { ok: true };
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;

  const { error } = await ctx.admin
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  return { ok: true };
}
