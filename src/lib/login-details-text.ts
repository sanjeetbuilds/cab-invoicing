import { PLATFORM_BRAND_NAME } from "@/lib/platform-config";

/** The exact text behind every "Copy login details" button — shared by
 *  the admin panel's create-company/resend-password flows and the team
 *  invite flow, so the WhatsApp message is always worded the same way. */
export function buildLoginDetailsText(args: {
  company: string;
  appUrl: string;
  email: string;
  password: string;
}): string {
  return `Your ${PLATFORM_BRAND_NAME} account for ${args.company} is ready.
Login: ${args.appUrl}
Email: ${args.email}
Temporary password: ${args.password}

You'll be asked to set your own password on first login. This password expires in 7 days.`;
}
