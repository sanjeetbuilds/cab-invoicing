"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { originFromHeaders } from "@/lib/origin";
import { checkLockout, recordLoginFailure, clearLoginFailures } from "@/lib/login-lockout";
import { completeForcedPasswordChange, isTempPasswordExpired } from "@/lib/temp-password-state";

const PASSWORD_MIN = 8;

const SignInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

const ForgotSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

const ResetSchema = z.object({
  password: z
    .string()
    .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters.`),
});

export type AuthFailReason = "unregistered" | "wrong_password" | "unverified" | "locked" | "expired";

export type AuthResult =
  | { ok: true; next: string }
  | {
      ok: false;
      error: string;
      reason?: AuthFailReason;
      /** Only set when reason is "locked". */
      retryInSeconds?: number;
      /** Only set when reason is "unverified" — who the "we've sent a new
       *  link to" message refers to, and the resend button's target. */
      email?: string;
    };

export type SimpleResult = { ok: true } | { ok: false; error: string };

function safePath(next: string | undefined): string {
  if (!next) return "/";
  return next.startsWith("/") ? next : "/";
}

/**
 * Looks an email up against the auth user list via the admin API. Used to
 * tell "no account" apart from "wrong password" at sign-in, now that
 * self-serve signup is closed and every account exists because someone
 * was invited. listUsers() isn't filterable by email server-side in the
 * installed supabase-js version, so this is an in-memory scan — fine at
 * invite-only scale, worth revisiting if the user base grows large.
 */
async function findUserByEmail(email: string) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const target = email.toLowerCase();
  return (data?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === target) ?? null;
}

/**
 * Sign in with email + password. Returns where to redirect on success.
 */
export async function signInAction(formData: FormData): Promise<AuthResult> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const email = parsed.data.email.toLowerCase();

  const rate = await rateLimit({
    action: "sign-in",
    limit: 20,
    windowMs: 60_000,
  });
  if (!rate.ok) return { ok: false, error: rate.message };

  const lockout = checkLockout(email);
  if (lockout.locked) {
    return {
      ok: false,
      reason: "locked",
      retryInSeconds: lockout.retryInSeconds,
      error: "Too many attempts. Try again in 15 minutes.",
    };
  }

  // Closed signup: every real account came from an invite. Reject
  // unregistered emails here, server-side, before even trying a password.
  const user = await findUserByEmail(email);
  if (!user) {
    return {
      ok: false,
      reason: "unregistered",
      error: "This email isn't registered. Contact us to get access.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    if (/email not confirmed/i.test(error.message)) {
      // Send a fresh confirmation link right away — the message below
      // promises one's already on its way.
      await supabase.auth.resend({ type: "signup", email });
      return {
        ok: false,
        reason: "unverified",
        email,
        error: `Please verify your email first. We've sent a new link to ${email}.`,
      };
    }

    recordLoginFailure(email);
    return { ok: false, reason: "wrong_password", error: "Incorrect email or password." };
  }

  clearLoginFailures(email);

  // A temporary password that's gone unused for 7 days is dead on arrival
  // — block the session immediately rather than letting it through only
  // to bounce off the /set-password redirect.
  const meta = (data.user?.user_metadata ?? {}) as {
    must_change_password?: boolean;
    temp_password_set_at?: string;
  };
  if (meta.must_change_password && isTempPasswordExpired(meta.temp_password_set_at)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      reason: "expired",
      error: "Your temporary password has expired. Contact us for a new one.",
    };
  }

  return { ok: true, next: safePath(parsed.data.next) };
}

/** "Resend link" button on the unverified-email error state. */
export async function resendConfirmationAction(email: string): Promise<SimpleResult> {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  const rate = await rateLimit({
    action: "resend-confirmation",
    limit: 5,
    windowMs: 15 * 60_000,
  });
  if (!rate.ok) return { ok: false, error: rate.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Send a password reset email. Deliberately independent of the sign-in
 * lockout above — someone locked out of signing in must still be able to
 * reset their password instead of being stuck for 15 minutes.
 *
 * The link in the email lands on /auth/callback (exchanges the code for a
 * session) and then /sign-in/reset.
 */
export async function sendPasswordResetAction(
  formData: FormData,
): Promise<SimpleResult> {
  const parsed = ForgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  // Tighter limit on password-reset emails so the form can't be used
  // to spam an inbox.
  const rate = await rateLimit({
    action: "password-reset",
    limit: 3,
    windowMs: 60_000,
  });
  if (!rate.ok) return { ok: false, error: rate.message };

  const supabase = await createClient();
  const origin = await originFromHeaders();
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", "/sign-in/reset");

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: callbackUrl.toString() },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Apply the new password for the currently authenticated user. Called
 * after the user lands on /sign-in/reset via the email link.
 */
export async function resetPasswordAction(
  formData: FormData,
): Promise<SimpleResult> {
  const parsed = ResetSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const rate = await rateLimit({
    action: "password-reset-apply",
    limit: 5,
    windowMs: 60_000,
  });
  if (!rate.ok) return { ok: false, error: rate.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "The reset link has expired. Request a new one.",
    };
  }
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };

  // Someone with a pending temporary password can also get here via
  // "Forgot password" instead of /set-password — either path counts as
  // "they've now set their own password".
  await completeForcedPasswordChange(createAdminClient(), user.id);

  return { ok: true };
}

/**
 * Server-action redirect helper used by the sign-in form. Server actions
 * can't return Response objects directly to client components, so we wrap
 * the routing decision in an action that runs `redirect()` server-side.
 */
export async function gotoAfterAuth(next: string): Promise<void> {
  redirect(safePath(next));
}
