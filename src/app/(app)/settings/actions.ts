"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWriter } from "@/lib/auth";
import type { Role } from "@/lib/supabase/types";

const INVITABLE_ROLES: Role[] = ["admin", "staff", "viewer"];
const EDITABLE_ROLES: Role[] = ["owner", "admin", "staff", "viewer"];

const InviteSchema = z.object({
  email: z.string().email("Enter a valid email."),
  role: z.enum(INVITABLE_ROLES, { message: "Pick a role." }),
});

const UpdateRoleSchema = z.object({
  membership_id: z.string().uuid(),
  role: z.enum(EDITABLE_ROLES),
});

const IdSchema = z.object({ membership_id: z.string().uuid() });

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Send a team invite. We don't actually email anyone — we just create a
 * pending membership row with invited_email and no user_id. When the
 * invitee signs up with that email, claimPendingInvites() binds the row
 * to their user account.
 */
export async function inviteMemberAction(
  raw: { email: string; role: Role },
): Promise<ActionResult> {
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

  // If a pending invite for this email already exists on this company,
  // surface a clear error instead of creating a duplicate.
  const { data: existing } = await ctx.admin
    .from("memberships")
    .select("id, user_id, invited_email")
    .eq("company_id", ctx.companyId)
    .eq("invited_email", email)
    .maybeSingle<{ id: string; user_id: string | null; invited_email: string }>();
  if (existing) {
    return {
      ok: false,
      error: existing.user_id
        ? "That email is already on the team."
        : "That email already has a pending invite.",
    };
  }

  const { error } = await ctx.admin.from("memberships").insert({
    company_id: ctx.companyId,
    user_id: null,
    role: parsed.data.role,
    invited_email: email,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateMemberRoleAction(
  raw: { membership_id: string; role: Role },
): Promise<ActionResult> {
  const parsed = UpdateRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner") {
    return { ok: false, error: "Only owners can change roles." };
  }

  // Don't allow demoting the last owner of the company.
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
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false, error: "Only owners and admins can remove members." };
  }

  // Prevent removing the last owner.
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
