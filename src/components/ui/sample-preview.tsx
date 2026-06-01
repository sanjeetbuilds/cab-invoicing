"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Upload, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Empty-state preview pattern used on Clients, Vehicles, Rate cards,
 * Trips, Invoices, and Quotations when the page has zero real rows.
 *
 * The page passes its own faded "sample" rows as children rendered in
 * the real list layout. SamplePreview overlays a centered explainer
 * card with a single primary action plus optional Import-from-Excel
 * secondary and a "Step N of 6 in setup" hint.
 *
 * Rules baked in:
 * - Sample rows are aria-hidden and pointer-events-none, so they read
 *   as decoration and can't be tabbed into.
 * - A soft gradient fades the bottom of the sample area so it clearly
 *   isn't real data.
 * - The explainer card itself is role=status, the focus target, and
 *   the only interactive surface.
 * - Dismiss is persisted per pageKey in localStorage; once dismissed
 *   the preview never auto-returns on this browser.
 */
export function SamplePreview({
  pageKey,
  icon,
  title,
  body,
  primary,
  importHref,
  setupHint,
  children,
}: {
  /** Unique key for the dismissal flag in localStorage. */
  pageKey:
    | "clients"
    | "vehicles"
    | "rate-cards"
    | "trips"
    | "invoices"
    | "quotations";
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
  const storageKey = `easybills_sample_dismissed_${pageKey}_v1`;
  const [dismissed, setDismissed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey)) setDismissed(true);
    } catch {
      // localStorage unavailable, just leave dismissed=false.
    }
  }, [storageKey]);

  // Move keyboard focus to the explainer card on mount so screen
  // readers and tab-users land on the actionable content, not the
  // decorative sample rows behind it.
  useEffect(() => {
    if (!dismissed) cardRef.current?.focus();
  }, [dismissed]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="relative">
      {/* Faded sample rows. Hidden from a11y, never interactive. */}
      <div
        aria-hidden
        className="pointer-events-none select-none opacity-50"
        style={{
          // Soft bottom fade so the sample clearly isn't real data
          // and the eye is drawn back up toward the explainer card.
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)",
        }}
      >
        {children}
      </div>

      {/* Explainer card, the only interactive surface. */}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="status"
        className={cn(
          "absolute inset-x-0 top-6 mx-auto",
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
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
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
