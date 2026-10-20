import "server-only";
import { PLATFORM_BRAND_NAME } from "@/lib/platform-config";
import { HELP_CONTACT } from "@/lib/help-content";

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

/** Appended to every email this app sends, so there's always a way back
 *  to a human regardless of which template produced the email. */
function withFooter(html: string): string {
  return `${html}<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">${HELP_CONTACT.placements.emailFooter}</p>`;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const html = withFooter(args.html);

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
      body: JSON.stringify({ from, to: args.to, subject: args.subject, html }),
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

const SIGNOFF = `<p>— Team ${PLATFORM_BRAND_NAME}</p>`;

/** Sent whenever an owner account is created or re-issued a temporary
 *  password — by /admin's "+ New company", "Send new temporary password",
 *  or "Change owner email". Wording matches the "Copy login details" text
 *  exactly so the email and the WhatsApp fallback never disagree. */
export function sendTempPasswordEmail(args: {
  to: string;
  ownerName: string;
  companyName: string;
  appUrl: string;
  password: string;
}): Promise<SendResult> {
  return sendEmail({
    to: args.to,
    subject: `Your ${PLATFORM_BRAND_NAME} account for ${args.companyName} is ready`,
    html: `
      <p>Hi ${args.ownerName},</p>
      <p>Your account for <strong>${args.companyName}</strong> has been created.</p>
      <p>
        Login: <a href="${args.appUrl}">${args.appUrl}</a><br/>
        Email: ${args.to}<br/>
        Temporary password: <strong>${args.password}</strong>
      </p>
      <p>You'll be asked to set your own password when you first sign in. This temporary password expires in 7 days.</p>
      ${SIGNOFF}
    `,
  });
}

export function sendAddedAsOwnerEmail(args: {
  to: string;
  ownerName: string;
  companyName: string;
  signInUrl: string;
}): Promise<SendResult> {
  return sendEmail({
    to: args.to,
    subject: `You've been added as owner of ${args.companyName}`,
    html: `
      <p>Hi ${args.ownerName},</p>
      <p>You've been added as owner of <strong>${args.companyName}</strong>. Sign in with your existing password.</p>
      <p>Login: <a href="${args.signInUrl}">${args.signInUrl}</a></p>
      ${SIGNOFF}
    `,
  });
}
