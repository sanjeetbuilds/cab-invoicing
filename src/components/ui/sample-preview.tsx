"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Empty-state preview used on Clients, Vehicles, Rate cards, Trips,
 * Invoices, and Quotations when the page has zero real rows. The
 * page passes its own faded sample rows as children rendered in the
 * real list layout.
 *
 * Layout:
 *   [page header (real toolbar buttons, always clickable)]
 *   [sample-preview banner: icon, title, body, primary action]
 *   [faded sample rows, capped reading width]
 *
 * The banner is a full-width horizontal band at the top of the
 * sample area, not a floating overlay. It never covers a row edge
 * or the toolbar, and there is no close X. The whole preview
 * disappears the moment the page has a real row.
 *
 * Sample rows are aria-hidden + pointer-events-none and are never
 * counted, saved, exported, or fed into the dashboard / setup
 * checklist, the page only enters this branch when the real row
 * count is zero.
 */
export function SamplePreview({
  icon,
  title,
  body,
  primary,
  importHref,
  setupHint,
  children,
}: {
  // Pre-rendered icon node (e.g. <Users className="h-4 w-4" />) so
  // the server page can pass it across the RSC boundary into this
  // client component without serializing a function reference.
  icon?: ReactNode;
  title: string;
  body: string;
  primary: { label: string; href: string };
  importHref?: string;
  setupHint?: { step: number; total: number };
  children: ReactNode;
}) {
  const bannerRef = useRef<HTMLDivElement>(null);

  // Move keyboard focus to the banner on mount so screen readers
  // and tab-users land on the actionable content, not the
  // decorative sample rows underneath it.
  useEffect(() => {
    bannerRef.current?.focus();
  }, []);

  return (
    // Capped reading width on wide screens so a row doesn't stretch
    // edge-to-edge with a big gap between the name on the left and
    // the amount on the right.
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
      {/* Guide banner: full-width horizontal band, no overlay. */}
      <div
        ref={bannerRef}
        tabIndex={-1}
        role="status"
        className={cn(
          "rounded-xl bg-card shadow-card p-4 sm:p-5",
          "flex flex-col gap-3 sm:flex-row sm:items-center",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        )}
      >
        {icon && (
          <span
            aria-hidden
            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(79,70,229,0.10)] text-[#4f46e5]"
          >
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{body}</p>
          {setupHint && (
            <Link
              href="/dashboard"
              className="inline-block mt-2 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Step {setupHint.step} of {setupHint.total} in setup
            </Link>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:shrink-0">
          <Link href={primary.href} className={buttonVariants()}>
            {primary.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {importHref && (
            <Link
              href={importHref}
              className={buttonVariants({ variant: "outline" })}
            >
              <Upload className="h-4 w-4" />
              Import from Excel
            </Link>
          )}
        </div>
      </div>

      {/* Faded sample rows below. Lower base opacity so even the
          top row reads as ghosted (not a real listing), with a
          downward gradient on top of that for the lower rows. */}
      <div
        aria-hidden
        className="pointer-events-none select-none opacity-45"
        style={{
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0) 95%)",
          WebkitMaskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0) 95%)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
