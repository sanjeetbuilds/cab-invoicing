"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdminAction } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { originFromHeaders } from "@/lib/origin";
import { logAdminAction } from "@/lib/audit-log";
import { markMustChangePassword } from "@/lib/temp-password-state";
import { sendTempPasswordEmail, sendAddedAsOwnerEmail } from "@/lib/email/send";
import { INDIA_STATES } from "@/lib/india-states";
import type { CompanyStatus } from "@/lib/supabase/types";

const NAME_RE = /^[A-Za-z ]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const CreateCompanySchema = z.object({
  name: z.string().trim().min(2, "Enter company name (2–80 characters)").max(80, "Enter company name (2–80 characters)"),
  state: z.enum(INDIA_STATES as unknown as [string, ...string[]], {
    message: "Pick the company's state.",
  }),
  ownerName: z
    .string()
    .trim()
    .min(2, "Enter owner's name — letters only")
    .max(60, "Enter owner's name — letters only")
    .regex(NAME_RE, "Enter owner's name — letters only"),
  ownerEmail: z.string().trim().email("Enter a valid email"),
  ownerMobile: z
    .union([z.string().trim().regex(MOBILE_RE, "Enter a valid 10-digit mobile number"), z.literal("")])
    .optional(),
  internalNote: z.string().trim().max(300).optional(),
  tempPassword: z.string().regex(PASSWORD_RE, "Password must have 8+ characters, a letter and a number."),
  /** Set once the admin has confirmed past the duplicate-name warning. */
  confirmDuplicate: z.boolean().optional(),
});

export interface CreateCompanyResult {
  ok: boolean;
  error?: string;
  /** True when a company with this name already exists and the caller
   *  hasn't confirmed yet — show the confirm dialog and resubmit with
   *  confirmDuplicate: true. */
  needsDuplicateConfirm?: boolean;
  /** How to toast the outcome / what the success panel should show. */
  outcome?: "created" | "added_existing";
  companyName?: string;
  ownerName?: string;
  ownerEmail?: string;
  /** Only set for outcome "created" — never persisted anywhere, shown once. */
  tempPassword?: string;
  appUrl?: string;
  emailSent?: boolean;
}

export async function createCompanyAction(
  raw: z.infer<typeof CreateCompanySchema>,
): Promise<CreateCompanyResult> {
  const parsed = CreateCompanySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireSuperAdminAction();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const admin = ctx.admin;

  const name = parsed.data.name;
  const email = parsed.data.ownerEmail.toLowerCase();

  if (!parsed.data.confirmDuplicate) {
    const { data: dup } = await admin
      .from("companies")
      .select("id")
      .ilike("name", name)
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (dup) {
      return {
        ok: false,
        needsDuplicateConfirm: true,
        error: `A company named '${name}' already exists. Create anyway?`,
      };
    }
  }

  const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = existingUsers?.users.find((u) => (u.email ?? "").toLowerCase() === email);

  const status: CompanyStatus = existing ? "active" : "invited";

  const { data: company, error: cErr } = await admin
    .from("companies")
    .insert({
      name,
      state: parsed.data.state,
      status,
      created_via: "admin",
      internal_note: parsed.data.internalNote || null,
    })
    .select("id")
    .single<{ id: string }>();
  if (cErr || !company) {
    return { ok: false, error: cErr?.message ?? "Could not create company." };
  }

  const origin = await originFromHeaders();
  const appUrl = `${origin}/sign-in`;

  if (existing) {
    const { error: mErr } = await admin.from("memberships").insert({
      company_id: company.id,
      user_id: existing.id,
      role: "owner",
      invited_email: email,
      member_name: parsed.data.ownerName,
      accepted_at: new Date().toISOString(),
    });
    if (mErr) {
      await admin.from("companies").delete().eq("id", company.id);
      return { ok: false, error: mErr.message };
    }

    await logAdminAction(admin, {
      companyId: company.id,
      actorUserId: ctx.userId,
      actorEmail: ctx.userEmail,
      action: "created",
      metadata: { ownerEmail: email, viaExistingAccount: true },
    });

    const result = await sendAddedAsOwnerEmail({
      to: email,
      ownerName: parsed.data.ownerName,
      companyName: name,
      signInUrl: appUrl,
    });
    revalidatePath("/admin");
    return {
      ok: true,
      outcome: "added_existing",
      companyName: name,
      ownerName: parsed.data.ownerName,
      ownerEmail: email,
      emailSent: result.ok && !result.skipped,
    };
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.tempPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    await admin.from("companies").delete().eq("id", company.id);
    return { ok: false, error: createErr?.message ?? "Could not create the account." };
  }
  await markMustChangePassword(admin, created.user.id);

  const { error: mErr } = await admin.from("memberships").insert({
    company_id: company.id,
    user_id: created.user.id,
    role: "owner",
    invited_email: email,
    member_name: parsed.data.ownerName,
    accepted_at: null,
  });
  if (mErr) {
    await admin.from("companies").delete().eq("id", company.id);
    return { ok: false, error: mErr.message };
  }

  await logAdminAction(admin, {
    companyId: company.id,
    actorUserId: ctx.userId,
    actorEmail: ctx.userEmail,
    action: "created",
    metadata: { ownerEmail: email, viaExistingAccount: false },
  });

  const result = await sendTempPasswordEmail({
    to: email,
    ownerName: parsed.data.ownerName,
    companyName: name,
    appUrl,
    password: parsed.data.tempPassword,
  });

  revalidatePath("/admin");
  return {
    ok: true,
    outcome: "created",
    companyName: name,
    ownerName: parsed.data.ownerName,
    ownerEmail: email,
    tempPassword: parsed.data.tempPassword,
    appUrl,
    emailSent: result.ok && !result.skipped,
  };
}

const CompanyIdSchema = z.object({ companyId: z.string().uuid() });

export interface TempPasswordActionResult {
  ok: boolean;
  error?: string;
  companyName?: string;
  ownerEmail?: string;
  tempPassword?: string;
  appUrl?: string;
  emailSent?: boolean;
}

async function loadOwner(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
): Promise<{ userId: string; email: string; name: string | null; companyName: string; companyStatus: CompanyStatus } | null> {
  const { data: company } = await admin
    .from("companies")
    .select("name, status")
    .eq("id", companyId)
    .maybeSingle<{ name: string; status: CompanyStatus }>();
  if (!company) return null;

  const { data: membership } = await admin
    .from("memberships")
    .select("user_id, member_name")
    .eq("company_id", companyId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ user_id: string | null; member_name: string | null }>();
  if (!membership?.user_id) return null;

  const { data } = await admin.auth.admin.getUserById(membership.user_id);
  if (!data.user?.email) return null;

  return {
    userId: membership.user_id,
    email: data.user.email,
    name: membership.member_name,
    companyName: company.name,
    companyStatus: company.status,
  };
}

/**
 * Issues a brand new temporary password for the company's owner —
 * available whether they never logged in yet, their password expired, or
 * they're fully active and just need a reset. Invalidates whatever
 * password was set before.
 */
export async function sendNewTempPasswordAction(raw: {
  companyId: string;
  tempPassword: string;
}): Promise<TempPasswordActionResult> {
  const parsed = z
    .object({ companyId: z.string().uuid(), tempPassword: z.string().regex(PASSWORD_RE) })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Something went wrong." };

  const ctx = await requireSuperAdminAction();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const admin = ctx.admin;

  const owner = await loadOwner(admin, parsed.data.companyId);
  if (!owner) return { ok: false, error: "Owner account not found." };

  const { error: updErr } = await admin.auth.admin.updateUserById(owner.userId, {
    password: parsed.data.tempPassword,
  });
  if (updErr) return { ok: false, error: updErr.message };
  await markMustChangePassword(admin, owner.userId);

  const origin = await originFromHeaders();
  const appUrl = `${origin}/sign-in`;
  const result = await sendTempPasswordEmail({
    to: owner.email,
    ownerName: owner.name ?? "there",
    companyName: owner.companyName,
    appUrl,
    password: parsed.data.tempPassword,
  });

  await logAdminAction(admin, {
    companyId: parsed.data.companyId,
    actorUserId: ctx.userId,
    actorEmail: ctx.userEmail,
    action: "temp_password_sent",
    metadata: { email: owner.email },
  });

  revalidatePath("/admin");
  return {
    ok: true,
    companyName: owner.companyName,
    ownerEmail: owner.email,
    tempPassword: parsed.data.tempPassword,
    appUrl,
    emailSent: result.ok && !result.skipped,
  };
}

const ChangeOwnerEmailSchema = z.object({
  companyId: z.string().uuid(),
  newEmail: z.string().trim().email("Enter a valid email"),
  tempPassword: z.string().regex(PASSWORD_RE),
});

/**
 * Only reachable before the owner's first login (status "invited") — once
 * active, they own their own email the normal way. Changing it also
 * regenerates the temporary password, since the old one was only ever
 * shared to the address being replaced.
 */
export async function changeOwnerEmailAction(
  raw: z.infer<typeof ChangeOwnerEmailSchema>,
): Promise<TempPasswordActionResult> {
  const parsed = ChangeOwnerEmailSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireSuperAdminAction();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const admin = ctx.admin;

  const owner = await loadOwner(admin, parsed.data.companyId);
  if (!owner) return { ok: false, error: "Owner account not found." };
  if (owner.companyStatus !== "invited") {
    return { ok: false, error: "The owner's email can only be changed before their first login." };
  }

  const newEmail = parsed.data.newEmail.toLowerCase();
  const oldEmail = owner.email;

  const { error: updErr } = await admin.auth.admin.updateUserById(owner.userId, {
    email: newEmail,
    password: parsed.data.tempPassword,
    email_confirm: true,
  });
  if (updErr) return { ok: false, error: updErr.message };
  await markMustChangePassword(admin, owner.userId);

  await admin
    .from("memberships")
    .update({ invited_email: newEmail })
    .eq("company_id", parsed.data.companyId)
    .eq("role", "owner");

  const origin = await originFromHeaders();
  const appUrl = `${origin}/sign-in`;
  const result = await sendTempPasswordEmail({
    to: newEmail,
    ownerName: owner.name ?? "there",
    companyName: owner.companyName,
    appUrl,
    password: parsed.data.tempPassword,
  });

  await logAdminAction(admin, {
    companyId: parsed.data.companyId,
    actorUserId: ctx.userId,
    actorEmail: ctx.userEmail,
    action: "owner_email_changed",
    metadata: { oldEmail, newEmail },
  });

  revalidatePath("/admin");
  return {
    ok: true,
    companyName: owner.companyName,
    ownerEmail: newEmail,
    tempPassword: parsed.data.tempPassword,
    appUrl,
    emailSent: result.ok && !result.skipped,
  };
}

export type SimpleActionResult = { ok: true } | { ok: false; error: string };

/**
 * Only reachable before the owner's first login. Also removes the
 * orphaned login itself (not just the company) — it never actually
 * signed into anything, so nothing of theirs is lost, and leaving it
 * behind would permanently block that email from being used to create a
 * new company later (it would look like "already has an account" with a
 * password nobody knows).
 */
export async function deleteCompanyAction(raw: {
  companyId: string;
}): Promise<SimpleActionResult> {
  const parsed = CompanyIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireSuperAdminAction();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const admin = ctx.admin;

  const { data: company } = await admin
    .from("companies")
    .select("id, name, status")
    .eq("id", parsed.data.companyId)
    .maybeSingle<{ id: string; name: string; status: CompanyStatus }>();
  if (!company) return { ok: false, error: "Company not found." };
  if (company.status !== "invited") {
    return { ok: false, error: "Only a company that hasn't logged in yet can be deleted." };
  }

  const { data: membership } = await admin
    .from("memberships")
    .select("user_id")
    .eq("company_id", company.id)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ user_id: string | null }>();

  await logAdminAction(admin, {
    companyId: company.id,
    actorUserId: ctx.userId,
    actorEmail: ctx.userEmail,
    action: "deleted",
    metadata: { companyName: company.name },
  });

  const { error } = await admin.from("companies").delete().eq("id", parsed.data.companyId);
  if (error) return { ok: false, error: error.message };

  if (membership?.user_id) {
    const { count } = await admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", membership.user_id);
    if ((count ?? 0) === 0) {
      await admin.auth.admin.deleteUser(membership.user_id);
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}

const SuspendSchema = z.object({
  companyId: z.string().uuid(),
  reason: z.string().trim().min(5, "Reason must be 5–200 characters.").max(200, "Reason must be 5–200 characters."),
});

export async function suspendCompanyAction(
  raw: z.infer<typeof SuspendSchema>,
): Promise<SimpleActionResult> {
  const parsed = SuspendSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireSuperAdminAction();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const admin = ctx.admin;

  const { data: company } = await admin
    .from("companies")
    .select("status")
    .eq("id", parsed.data.companyId)
    .maybeSingle<{ status: CompanyStatus }>();
  if (!company) return { ok: false, error: "Company not found." };
  if (company.status !== "active") {
    return { ok: false, error: "Only an active company can be suspended." };
  }

  const { error } = await admin
    .from("companies")
    .update({ status: "suspended" })
    .eq("id", parsed.data.companyId);
  if (error) return { ok: false, error: error.message };

  await logAdminAction(admin, {
    companyId: parsed.data.companyId,
    actorUserId: ctx.userId,
    actorEmail: ctx.userEmail,
    action: "suspended",
    reason: parsed.data.reason,
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function reactivateCompanyAction(raw: {
  companyId: string;
}): Promise<SimpleActionResult> {
  const parsed = CompanyIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireSuperAdminAction();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const admin = ctx.admin;

  const { data: company } = await admin
    .from("companies")
    .select("status")
    .eq("id", parsed.data.companyId)
    .maybeSingle<{ status: CompanyStatus }>();
  if (!company) return { ok: false, error: "Company not found." };
  if (company.status !== "suspended") {
    return { ok: false, error: "Only a suspended company can be reactivated." };
  }

  const { error } = await admin
    .from("companies")
    .update({ status: "active" })
    .eq("id", parsed.data.companyId);
  if (error) return { ok: false, error: error.message };

  await logAdminAction(admin, {
    companyId: parsed.data.companyId,
    actorUserId: ctx.userId,
    actorEmail: ctx.userEmail,
    action: "reactivated",
  });

  revalidatePath("/admin");
  return { ok: true };
}
