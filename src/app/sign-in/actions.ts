"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SignInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  next: z.string().optional(),
});

export type SignInResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export async function sendMagicLink(formData: FormData): Promise<SignInResult> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  const callbackUrl = new URL("/auth/callback", origin);
  if (parsed.data.next) callbackUrl.searchParams.set("next", parsed.data.next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, email: parsed.data.email };
}
