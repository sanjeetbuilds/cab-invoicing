import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Header block for every list page. Holds the title, action buttons,
 * and any filter chrome (search input, filter button, status pills),
 * stacked vertically with gap-3.
 *
 * It sticks to the top of the page scroll with a solid background, the
 * same as the page, and sits above the rows, so the title and filters
 * stay in reach as the list scrolls and rows pass cleanly underneath.
 * It stays in normal flow, top 0 with no negative margin and no padding
 * above it, so the first row is fully visible right below it.
 *
 * The inner block keeps a 12px gap between the buttons and the 0.5px
 * hairline so the line is never jammed against the content. The outer
 * block adds a 12px solid band below the hairline, so rows disappear a
 * touch below the line and the first card is never sliced right at it.
 * Surfaces stay flat.
 */
export function ListHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="sticky top-0 z-30 bg-background pb-3">
      <div
        className={cn(
          "flex flex-col gap-3 border-b-[0.5px] border-border pb-3",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
