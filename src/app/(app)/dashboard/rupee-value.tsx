"use client";

import { useState } from "react";

/**
 * The rupee value shown in a dashboard metric box. By default it shows
 * the short figure (for example a lakh or crore form) and carries the
 * exact figure in the title attribute, so hovering on desktop reveals
 * it. On phones, where there is no hover, tapping the value toggles to
 * the full figure and a second tap goes back.
 *
 * The size and font stay the same in both states, so the box never
 * grows whether the figure is four thousand or four crore.
 */
export function RupeeValue({ short, full }: { short: string; full: string }) {
  const [showFull, setShowFull] = useState(false);
  const toggle = () => setShowFull((v) => !v);

  return (
    <span
      role="button"
      tabIndex={0}
      title={full}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      className="cursor-pointer select-none text-2xl font-medium text-foreground whitespace-nowrap"
    >
      {showFull ? full : short}
    </span>
  );
}
