"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const Schema = z.object({
  itemType: z.enum(["guide", "faq"]),
  itemSlug: z.string().min(1),
  helpful: z.boolean(),
  comment: z.string().trim().max(300).optional(),
});

export type HelpFeedbackResult = { ok: true } | { ok: false; error: string };

export async function submitHelpFeedbackAction(
  raw: z.infer<typeof Schema>,
): Promise<HelpFeedbackResult> {
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const rate = await rateLimit({ action: "help-feedback", limit: 10, windowMs: 60_000 });
  if (!rate.ok) return { ok: false, error: rate.message };

  // Best-effort personalization only — feedback is accepted from
  // signed-out visitors too, since the help pages themselves are public.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let companyId: string | null = null;
  if (user) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle<{ company_id: string }>();
    companyId = membership?.company_id ?? null;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("help_feedback").insert({
    item_type: parsed.data.itemType,
    item_slug: parsed.data.itemSlug,
    helpful: parsed.data.helpful,
    comment: parsed.data.comment || null,
    user_id: user?.id ?? null,
    company_id: companyId,
  });
  if (error) return { ok: false, error: "Couldn't save your feedback. Please try again." };

  return { ok: true };
}
