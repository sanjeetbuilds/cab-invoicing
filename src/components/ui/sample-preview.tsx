"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Empty-state preview used on Clients, Vehicles, Rate cards, Trips,
 * Invoices, and Quotations when the page has zero real rows.
 *
 * Layout: the sample rows (passed as children) flow underneath in
 * the real list layout, with a downward gradient fade. The guide
 * card floats over them at the top, anchored by an indigo left
 * accent and a slightly stronger shadow so it reads as a layer on
 * top of the list, never merging into a row edge.
 *
 * Renders only while the page has zero real rows and disappears
 * the moment a real row exists. No close X, no stored dismiss
 * state. Sample rows stay aria-hidden + pointer-events-none and
 * are never counted, saved, or exported.
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
  icon?: ReactNode;
  title: string;
  body: string;
  primary: { label: string; href: string };
  importHref?: string;
  setupHint?: { step: number; total: number };
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Move keyboard focus to the guide card on mount so screen
  // readers and tab-users land on the actionable content, not the
  // decorative sample rows behind it.
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      {/* Faded sample rows beneath the floating card. Natural
          opacity + downward gradient, with a soft blur so anything
          directly behind the card reads as a layer below it rather
          than merging with the card's edges. Hidden from a11y. */}
      <div
        aria-hidden
        className="pointer-events-none select-none opacity-70 [filter:blur(0.5px)] min-h-[calc(100dvh-14rem)]"
        style={{
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0) 95%)",
          WebkitMaskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0) 95%)",
        }}
      >
        {children}
      </div>

      {/* Floating guide card. Sits above the rows; clearly its own
          layer thanks to the white surface, a hairline border, and
          the heavier shadow-card-hover. No coloured edge accent,
          the tinted icon below carries the only colour. */}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="status"
        className={cn(
          "absolute inset-x-0 top-6 mx-auto",
          "w-[min(440px,calc(100%-32px))]",
          "rounded-xl bg-card border border-border shadow-card-hover",
          "p-5 flex flex-col gap-3",
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
