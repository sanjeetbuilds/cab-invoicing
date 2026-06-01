"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Empty-state preview pattern used on Clients, Vehicles, Rate cards,
 * Trips, Invoices, and Quotations when the page has zero real rows.
 *
 * The page passes its own faded "sample" rows as children rendered in
 * the real list layout. SamplePreview lays them under a soft
 * downward gradient that fades to nothing so the lower rows can't be
 * mistaken for real data, and overlays a single guide card on top
 * with the primary action.
 *
 * Driven entirely by data, not a dismiss flag: the page renders this
 * whenever it has zero real rows, and stops the moment a real row
 * exists. No stored "dismissed" state, no X button. If a user opens
 * the add form and leaves without saving, they come back to the
 * same guide.
 *
 * Sample rows are aria-hidden + pointer-events-none and are never
 * counted or saved, the page already gated this branch on "zero real
 * rows" before rendering.
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
  // Pre-rendered icon node (e.g. <Users className="h-4 w-4" />) so the
  // server page can pass it across the RSC boundary into this client
  // component without trying to serialize a function reference.
  icon?: ReactNode;
  title: string;
  body: string;
  primary: { label: string; href: string };
  importHref?: string;
  setupHint?: { step: number; total: number };
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Move keyboard focus to the explainer card on mount so screen
  // readers and tab-users land on the actionable content, not the
  // decorative sample rows behind it.
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      {/* Faded sample rows. Hidden from a11y, never interactive.
          Min-height pushes the gradient down toward the viewport
          bottom so the page never reads as "blank" below the guide. */}
      <div
        aria-hidden
        className="pointer-events-none select-none opacity-60 min-h-[calc(100dvh-14rem)]"
        style={{
          // Aggressive fade: full at the top, half at 40%, gone by
          // 90%. Combined with opacity-60 above, the bottom half is
          // clearly sample-not-real.
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0) 95%)",
          WebkitMaskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0) 95%)",
        }}
      >
        {children}
      </div>

      {/* Guide card. Positioned absolute inside this wrapper, so it
          sits BELOW the page's PageHeader (which renders before this
          wrapper). The page's primary action buttons (Log trip,
          Bulk add, Build invoice, etc.) stay fully clickable above
          this card. */}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="status"
        className={cn(
          "absolute inset-x-0 top-4 mx-auto",
          "w-[min(420px,calc(100%-32px))]",
          "rounded-xl bg-card shadow-card-hover p-5",
          "flex flex-col gap-3",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        )}
      >
        <div className="flex items-start gap-3">
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
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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

        {setupHint && (
          <Link
            href="/dashboard"
            className="self-start text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Step {setupHint.step} of {setupHint.total} in setup
          </Link>
        )}
      </div>
    </div>
  );
}
