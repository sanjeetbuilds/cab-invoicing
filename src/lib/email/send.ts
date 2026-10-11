import "server-only";

/**
 * Thin wrapper around Resend's HTTP API (no SDK dependency — one fetch
 * call). Until RESEND_API_KEY is set, every send is skipped (ok:true,
 * skipped:true) and logged to the console instead — the thing calling
 * this should never fail just because email isn't configured yet.
 */

export interface SendResult {
  ok: boolean;
  /** True when no provider is configured, or the provider call failed. */
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      `[email] RESEND_API_KEY/EMAIL_FROM not set, skipping send. To: ${args.to}, Subject: ${args.subject}`,
    );
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: args.to, subject: args.subject, html: args.html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend send failed: ${res.status} ${body}`);
      return { ok: false, skipped: true, error: `Email provider error (${res.status}).` };
    }
    return { ok: true };
  } catch (e) {
    console.error(`[email] Resend send threw: ${(e as Error).message}`);
    return { ok: false, skipped: true, error: (e as Error).message };
  }
}

/** Where every new waitlist signup gets announced. */
export const WAITLIST_NOTIFY_EMAIL = "hello@taximunshi.com";

export function sendWaitlistNotification(lead: {
  company: string;
  email: string;
  phone: string;
}): Promise<SendResult> {
  return sendEmail({
    to: WAITLIST_NOTIFY_EMAIL,
    subject: `New waitlist signup: ${lead.company}`,
    html: `
      <p>A new company just joined the TaxiMunshi waitlist.</p>
      <ul>
        <li><strong>Company:</strong> ${lead.company}</li>
        <li><strong>Email:</strong> ${lead.email}</li>
        <li><strong>Phone:</strong> ${lead.phone}</li>
      </ul>
    `,
  });
}
