"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BrandMode } from "@/lib/supabase/types";

/**
 * Renders the company brand for the app shell, either as text, just the
 * uploaded logo, or logo + text. Falls back to text if the logo image
 * fails to load (404, blocked, etc.) so the header never goes blank.
 *
 * `size` controls the logo height. Width scales by the stored aspect
 * ratio, capped so very wide logos don't push the layout around.
 */
export function BrandDisplay({
  mode,
  name,
  logoUrl,
  aspectRatio,
  size,
  className,
}: {
  mode: BrandMode;
  name: string;
  logoUrl: string | null;
  aspectRatio: number | null;
  size: "sidebar" | "topbar-mobile";
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  // Treat a missing URL identically to a failed load, both produce the
  // same fallback path.
  const haveLogo = !!logoUrl && !imgFailed;

  // Effective mode after fallback resolution.
  const effective: BrandMode =
    !haveLogo && mode !== "text_only" ? "text_only" : mode;

  // Tuned heights, sidebar gets a touch more vertical space than the
  // mobile top strip. Companion text size scales with it.
  const heights = {
    sidebar: { logoOnly: 36, withText: 24, textClass: "text-base" },
    "topbar-mobile": { logoOnly: 32, withText: 22, textClass: "text-sm" },
  } as const;
  const h = heights[size];

  function logoEl(targetHeight: number) {
    const w = aspectRatio ? targetHeight * aspectRatio : targetHeight;
    const maxW = size === "sidebar" ? 180 : 140;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl ?? ""}
        alt={name}
        style={{
          height: targetHeight,
          width: Math.min(w, maxW),
        }}
        onError={() => setImgFailed(true)}
        className="object-contain"
      />
    );
  }

  if (effective === "text_only") {
    return (
      <p
        className={cn(
          "font-semibold text-foreground truncate",
          h.textClass,
          className,
        )}
        title={name}
      >
        {name}
      </p>
    );
  }

  if (effective === "logo_only") {
    return <div className={cn("flex items-center", className)}>{logoEl(h.logoOnly)}</div>;
  }

  // logo_with_text
  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      {logoEl(h.withText)}
      <p
        className={cn(
          "font-semibold text-foreground truncate",
          h.textClass,
        )}
        title={name}
      >
        {name}
      </p>
    </div>
  );
}
