"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";
import type { Role } from "@/lib/supabase/types";

const INVITABLE_ROLES: Role[] = ["admin", "staff", "viewer"];
const EDITABLE_ROLES: Role[] = ["owner", "admin", "staff", "viewer"];

const CompanySchema = z.object({
  name: z.string().min(1, "Company name is required."),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z
    .union([z.string().email("Enter a valid email."), z.literal("")])
    .optional()
    .default(""),
  gstin: z.string().optional().default(""),
  state: z.string().min(1, "Pick a state."),
});

const NumberingSchema = z.object({
  invoice_prefix: z.string().optional().default(""),
  next_invoice_number: z.number().int().min(1),
  quotation_prefix: z.string().optional().default(""),
  next_quotation_number: z.number().int().min(1),
});

const TermsSchema = z.object({
  terms_invoice: z.array(z.string()).default([]),
  terms_quotation: z.array(z.string()).default([]),
});

const InviteSchema = z.object({
  email: z.string().email("Enter a valid email."),
  role: z.enum(INVITABLE_ROLES, { message: "Pick a role." }),
});

const UpdateRoleSchema = z.object({
  membership_id: z.string().uuid(),
  role: z.enum(EDITABLE_ROLES),
});

const IdSchema = z.object({ membership_id: z.string().uuid() });

export type ActionResult = { ok: true } | { ok: false; error: string };

export type InviteResult =
  | { ok: true; email: string; tempPassword: string }
  | { ok: false; error: string };

export async function updateCompanyAction(
  raw: z.infer<typeof CompanySchema>,
): Promise<ActionResult> {
  const parsed = CompanySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false, error: "Only owners and admins can update company info." };
  }

  const { error } = await ctx.admin
    .from("companies")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      gstin: parsed.data.gstin || null,
      state: parsed.data.state,
    })
    .eq("id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateNumberingAction(
  raw: z.infer<typeof NumberingSchema>,
): Promise<ActionResult> {
  const parsed = NumberingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false, error: "Only owners and admins can edit numbering." };
  }

  const { error } = await ctx.admin
    .from("companies")
    .update({
      invoice_prefix: parsed.data.invoice_prefix ?? "",
      next_invoice_number: parsed.data.next_invoice_number,
      quotation_prefix: parsed.data.quotation_prefix ?? "",
      next_quotation_number: parsed.data.next_quotation_number,
    })
    .eq("id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateTermsAction(
  raw: z.infer<typeof TermsSchema>,
): Promise<ActionResult> {
  const parsed = TermsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false, error: "Only owners and admins can edit terms." };
  }

  const { error } = await ctx.admin
    .from("companies")
    .update({
      terms_invoice: parsed.data.terms_invoice,
      terms_quotation: parsed.data.terms_quotation,
    })
    .eq("id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Create the user via the admin API with a generated temporary password,
 * then attach them to the company as a member. Returns the temp password
 * so the inviter can copy it and share manually (no email required).
 */
export async function inviteMemberAction(
  raw: { email: string; role: Role },
): Promise<InviteResult> {
  const parsed = InviteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false, error: "Only owners and admins can invite members." };
  }

  const email = parsed.data.email.toLowerCase();

  // Prevent duplicate membership on this company.
  const { data: existingMembership } = await ctx.admin
    .from("memberships")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("invited_email", email)
    .maybeSingle<{ id: string }>();
  if (existingMembership) {
    return { ok: false, error: "That email is already a member." };
  }

  // Random temp password (16 chars, mixed). Inviter copies and shares it.
  const tempPassword = generateTempPassword();

  // Either find an existing auth user with that email, or create a new one.
  let userId: string | null = null;
  const { data: existingByEmail } = await ctx.admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const found = existingByEmail.users.find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );
  if (found) {
    userId = found.id;
  } else {
    const { data: created, error: createErr } =
      await ctx.admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
    if (createErr || !created.user) {
      return {
        ok: false,
        error: createErr?.message ?? "Failed to create user.",
      };
    }
    userId = created.user.id;
  }

  const { error: insertErr } = await ctx.admin.from("memberships").insert({
    company_id: ctx.companyId,
    user_id: userId,
    role: parsed.data.role,
    invited_email: email,
    accepted_at: new Date().toISOString(),
  });
  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }

  revalidatePath("/settings");
  return {
    ok: true,
    email,
    tempPassword: found
      ? "(existing user — they sign in with their current password)"
      : tempPassword,
  };
}

export async function updateMemberRoleAction(
  raw: { membership_id: string; role: Role },
): Promise<ActionResult> {
  const parsed = UpdateRoleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner") {
    return { ok: false, error: "Only owners can change roles." };
  }

  if (parsed.data.role !== "owner") {
    const { data: target } = await ctx.admin
      .from("memberships")
      .select("role, company_id")
      .eq("id", parsed.data.membership_id)
      .maybeSingle<{ role: Role; company_id: string }>();
    if (target?.role === "owner" && target.company_id === ctx.companyId) {
      const { count } = await ctx.admin
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("company_id", ctx.companyId)
        .eq("role", "owner");
      if ((count ?? 0) <= 1) {
        return { ok: false, error: "Can't demote the last owner." };
      }
    }
  }

  const { error } = await ctx.admin
    .from("memberships")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.membership_id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function removeMemberAction(
  raw: { membership_id: string },
): Promise<ActionResult> {
  const parsed = IdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false, error: "Only owners and admins can remove members." };
  }

  const { data: target } = await ctx.admin
    .from("memberships")
    .select("role, user_id")
    .eq("id", parsed.data.membership_id)
    .eq("company_id", ctx.companyId)
    .maybeSingle<{ role: Role; user_id: string | null }>();
  if (!target) return { ok: false, error: "Member not found." };
  if (target.role === "owner") {
    const { count } = await ctx.admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("company_id", ctx.companyId)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "Can't remove the last owner." };
    }
  }
  if (target.user_id === ctx.userId && target.role === "owner") {
    return { ok: false, error: "Use a different owner to remove yourself." };
  }

  const { error } = await ctx.admin
    .from("memberships")
    .delete()
    .eq("id", parsed.data.membership_id)
    .eq("company_id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

function generateTempPassword(): string {
  // Browser/edge runtimes have crypto.getRandomValues; we're on Node.
  // 16 chars from a mixed alphabet for human readability.
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  for (const b of buf) out += alphabet[b % alphabet.length];
  return out;
}
