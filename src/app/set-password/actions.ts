"use server";

import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { completeForcedPasswordChange, isTempPasswordExpired } from "@/lib/temp-password-state";

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const Schema = z
  .object({
    password: z.string().regex(PASSWORD_RE, "At least 8 characters, with a letter and a number."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export type SetPasswordResult = { ok: true } | { ok: false; error: string };

export async function setNewPasswordAction(raw: {
  password: string;
  confirm: string;
}): Promise<SetPasswordResult> {
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const rate = await rateLimit({ action: "set-password", limit: 10, windowMs: 60_000 });
  if (!rate.ok) return { ok: false, error: rate.message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { ok: false, error: "Your session has expired. Sign in again." };

  const meta = (user.user_metadata ?? {}) as { must_change_password?: boolean; temp_password_set_at?: string };
  if (!meta.must_change_password) {
    return { ok: true };
  }
  if (isTempPasswordExpired(meta.temp_password_set_at)) {
    return {
      ok: false,
      error: "Your temporary password has expired. Contact us for a new one.",
    };
  }

  const admin = createAdminClient();

  // A password grant with the SAME password only succeeds if it matches
  // what's currently set — the cleanest way to compare against the live
  // credential without ever storing the temporary password in plaintext.
  // A throwaway anon-key client (not the cookie-bound session client, and
  // not the service-role client — this is a plain password grant) so the
  // check has no side effect on the real session either way.
  const probe = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: sameCheck } = await probe.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (!sameCheck) {
    return { ok: false, error: "Choose a different password from the temporary one." };
  }

  const { error: updateErr } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updateErr) return { ok: false, error: updateErr.message };

  await completeForcedPasswordChange(admin, user.id);

  return { ok: true };
}
