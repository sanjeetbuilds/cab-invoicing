"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { claimPendingInvites } from "@/lib/auth";

const PASSWORD_MIN = 8;

const SignInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

const SignUpSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z
    .string()
    .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters.`),
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

export type AuthResult =
  | { ok: true; next: string }
  | { ok: false; error: string };

export type SimpleResult = { ok: true } | { ok: false; error: string };

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function safePath(next: string | undefined): string {
  if (!next) return "/";
  return next.startsWith("/") ? next : "/";
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Map Supabase's generic message to something a human can act on.
    const msg = /invalid login credentials/i.test(error.message)
      ? "Wrong email or password."
      : error.message;
    return { ok: false, error: msg };
  }

  if (data.user && data.user.email) {
    // Claim any pending team invite on their email so they land in the
    // right company on the next page load (instead of onboarding).
    await claimPendingInvites(data.user.id, data.user.email);
  }

  return { ok: true, next: safePath(parsed.data.next) };
}

/**
 * Create a new account with email + password. Email confirmation is
 * disabled in Supabase for v1, so the response includes a session
 * straight away and the user can be redirected.
 */
export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const msg = /user already registered|already exists/i.test(error.message)
      ? "An account with that email already exists. Try signing in instead."
      : error.message;
    return { ok: false, error: msg };
  }

  if (!data.session) {
    return {
      ok: false,
      error:
        "Email confirmation appears to be enabled in Supabase. Disable it (Auth → Providers → Email → 'Confirm email' off) or check your inbox to verify.",
    };
  }

  if (data.user && data.user.email) {
    // If they were invited, claim the membership now so we skip onboarding.
    await claimPendingInvites(data.user.id, data.user.email);
  }

  return { ok: true, next: safePath(parsed.data.next) };
}

/**
 * Send a password reset email. The link in the email lands on
 * /auth/callback (exchanges the code for a session) and then /sign-in/reset.
 */
export async function sendPasswordResetAction(
  formData: FormData,
): Promise<SimpleResult> {
  const parsed = ForgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
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
