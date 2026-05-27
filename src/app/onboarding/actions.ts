"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INDIA_STATES } from "@/lib/india-states";

const Schema = z.object({
  name: z.string().min(1, "Company name is required."),
  state: z.enum(INDIA_STATES as unknown as [string, ...string[]], {
    message: "Pick your registered state.",
  }),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  gstin: z.string().optional().default(""),
  invoice_prefix: z.string().optional().default(""),
  next_invoice_number: z.coerce.number().int().min(1).default(1),
});

export type CreateCompanyResult =
  | { ok: true; companyId: string }
  | { ok: false; error: string };

export async function createCompany(
  formData: FormData,
): Promise<CreateCompanyResult> {
  const parsed = Schema.safeParse({
    name: formData.get("name"),
    state: formData.get("state"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    gstin: formData.get("gstin") ?? "",
    invoice_prefix: formData.get("invoice_prefix") ?? "",
    next_invoice_number: formData.get("next_invoice_number") ?? 1,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  // Verify the caller is authenticated using the user-context client.
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Use the service-role admin client to bootstrap company + membership.
  // RLS still protects everything else; this is the one trusted seed insert
  // per user. We control authorization here via the getUser() check above.
  const admin = createAdminClient();

  const { data: company, error: cErr } = await admin
    .from("companies")
    .insert({
      name: parsed.data.name,
      state: parsed.data.state,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      gstin: parsed.data.gstin || null,
      invoice_prefix: parsed.data.invoice_prefix || "",
      next_invoice_number: parsed.data.next_invoice_number,
    })
    .select("id")
    .single();

  if (cErr || !company) {
    return { ok: false, error: cErr?.message ?? "Could not create company." };
  }

  const { error: mErr } = await admin.from("memberships").insert({
    company_id: company.id,
    user_id: user.id,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });

  if (mErr) {
    await admin.from("companies").delete().eq("id", company.id);
    return { ok: false, error: mErr.message };
  }

  return { ok: true, companyId: company.id };
}
