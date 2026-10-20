"use client";

import Link from "next/link";
import { LifeBuoy, Lightbulb, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildSupportMailto, buildSuggestFeatureMailto } from "@/lib/support-mailto";
import { REPLAY_EVENT } from "@/components/shell/tour-launcher";

export function HelpSupportSection({
  companyName,
  userName,
  userEmail,
}: {
  companyName: string;
  userName: string;
  userEmail: string;
}) {
  function onReplay() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
  }

  const contactHref = buildSupportMailto({
    company: companyName,
    name: userName,
    email: userEmail,
    pageUrl: typeof window !== "undefined" ? window.location.href : "",
    pageLabel: "Settings",
  });
  const suggestHref = buildSuggestFeatureMailto(companyName);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(79,70,229,0.10)] text-[#4f46e5]">
            <LifeBuoy className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-foreground">Help &amp; Support</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <Link href="/help" className={cn(buttonVariants({ variant: "outline" }))}>
            Help
          </Link>
          <Link href="/help/faq" className={cn(buttonVariants({ variant: "outline" }))}>
            FAQs
          </Link>
          <a href={contactHref} className={cn(buttonVariants({ variant: "outline" }))}>
            <Mail className="h-4 w-4" />
            Contact support
          </a>
          <a href={suggestHref} className={cn(buttonVariants({ variant: "outline" }))}>
            <Lightbulb className="h-4 w-4" />
            Suggest a feature
          </a>
          <Button type="button" variant="outline" onClick={onReplay}>
            Show tips again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
