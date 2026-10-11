"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

const Schema = z.object({
  company: z.string().trim().min(1, "Enter your company name."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().min(10, "Enter a valid phone number."),
});

export type WaitlistResult = { ok: true } | { ok: false; error: string };

export async function submitWaitlistLeadAction(raw: {
  company: string;
  email: string;
  phone: string;
}): Promise<WaitlistResult> {
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const rate = await rateLimit({ action: "waitlist-lead", limit: 5, windowMs: 60_000 });
  if (!rate.ok) return { ok: false, error: rate.message };

  const admin = createAdminClient();
  const { error } = await admin.from("waitlist_leads").insert({
    company: parsed.data.company,
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone,
    source: "taximunshi-landing",
  });
  if (error) return { ok: false, error: "Couldn't submit just now. Please try again." };

  return { ok: true };
}
