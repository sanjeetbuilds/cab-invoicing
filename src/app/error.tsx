"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateErrorRef } from "@/lib/error-ref";
import { plainSupportMailto } from "@/lib/support-mailto";
import { SUPPORT_CONTACT } from "@/lib/platform-config";

/**
 * Route-level error boundary for every page in the (app) and
 * (marketing) groups. Replaces the raw 500 with a calm message and
 * two clear next steps. Next.js renders this automatically when a
 * route segment throws at request time or during streaming.
 *
 * Must be a client component (Next.js requirement) and must not
 * import server-only modules.
 */
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [ref] = useState(generateErrorRef);

  useEffect(() => {
    // Log the real error (with our own reference code, not just Next's
    // own error.digest which isn't always present) so it's visible in
    // the browser console and in Vercel function logs — support can grep
    // for the code a user quotes in an email. Swap this for Sentry /
    // Logflare / whatever later if needed.
    console.error(`[route-error] ${ref}`, error);
  }, [error, ref]);

  return (
    <div className="mx-auto w-full max-w-md py-12">
      <Card
        elevated
        className="bg-[rgba(217,119,6,0.06)] border border-[rgba(217,119,6,0.18)]"
      >
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <span
            aria-hidden
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(217,119,6,0.14)]"
          >
            <TriangleAlert className="h-6 w-6 text-[#d97706]" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Something went wrong on this page.
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Please try again. If it keeps happening, go back to the
              dashboard.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted"
            >
              Go to dashboard
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            If it keeps happening, email{" "}
            <a href={plainSupportMailto()} className="font-medium text-primary hover:text-primary-hover">
              {SUPPORT_CONTACT}
            </a>{" "}
            and mention code{" "}
            <span className="font-mono font-medium text-foreground">{ref}</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
