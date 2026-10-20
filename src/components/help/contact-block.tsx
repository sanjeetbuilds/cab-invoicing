"use client";

import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HELP_CONTACT } from "@/lib/help-content";
import { buildSupportMailto } from "@/lib/support-mailto";
import { renderBold } from "@/lib/simple-markdown";

/**
 * The standard "Still stuck?" block — rendered at the bottom of every
 * help page. `pageLabel` is a human name for the current page/guide
 * (used in the email subject); the page URL itself is read from the
 * browser so it's always accurate without every caller having to pass it.
 */
export function ContactBlock({
  company,
  userName,
  userEmail,
  pageLabel,
}: {
  company: string;
  userName: string;
  userEmail: string;
  pageLabel: string;
}) {
  const pathname = usePathname();

  function mailtoHref(): string {
    const pageUrl =
      typeof window !== "undefined" ? window.location.href : pathname;
    return buildSupportMailto({ company, name: userName, email: userEmail, pageUrl, pageLabel });
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">{renderBold(HELP_CONTACT.standardBlock)}</p>
      <a href={mailtoHref()} className={cn(buttonVariants({ size: "sm" }))}>
        <Mail className="h-4 w-4" />
        {HELP_CONTACT.emailButtonLabel}
      </a>
    </div>
  );
}
