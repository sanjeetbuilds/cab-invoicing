import Link from "next/link";
import { ArrowRight, Upload, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

/**
 * Shared empty-state card used wherever a list could be a dead end.
 * Same shape on Clients, Vehicles, Rate Cards, and Trips so a blocked
 * page reads as "your next step", not "there's nothing here".
 *
 * `primary` is the main CTA, `importHref` adds the secondary
 * Import-from-Excel button where bulk import makes sense, and
 * `setupHint` shows a small "Step N of 6 in setup" link that takes
 * the user back to the dashboard checklist.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  primary,
  importHref,
  setupHint,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  primary: { label: string; href: string };
  importHref?: string;
  setupHint?: { step: number; total: number };
}) {
  return (
    <Card>
      <CardContent className="py-12 px-4 text-center flex flex-col items-center gap-3">
        <span
          aria-hidden
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <Icon className="h-6 w-6" />
        </span>

        <h2 className="text-base font-semibold text-foreground">{title}</h2>

        <p className="text-sm text-muted-foreground max-w-sm">{body}</p>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <Link href={primary.href} className={buttonVariants()}>
            {primary.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {importHref && (
            <Link href={importHref} className={buttonVariants({ variant: "outline" })}>
              <Upload className="h-4 w-4" />
              Import from Excel
            </Link>
          )}
        </div>

        {setupHint && (
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Step {setupHint.step} of {setupHint.total} in setup
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
