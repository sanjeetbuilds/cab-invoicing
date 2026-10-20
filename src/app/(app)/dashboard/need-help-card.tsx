import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HELP_CONTACT } from "@/lib/help-content";

export function NeedHelpCard() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(79,70,229,0.10)] text-[#4f46e5]">
          <CircleHelp className="h-4 w-4" />
        </span>
        <p className="text-sm text-muted-foreground">
          Need help? Check{" "}
          <Link href="/help" className="font-medium text-primary hover:text-primary-hover">
            Help &amp; FAQs
          </Link>{" "}
          or email us at{" "}
          <a href={`mailto:${HELP_CONTACT.supportEmail}`} className="font-medium text-primary hover:text-primary-hover">
            {HELP_CONTACT.supportEmail}
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
