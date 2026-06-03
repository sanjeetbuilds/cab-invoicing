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
 * above it, so the first row is fully visible right below it. A 0.5px
 * hairline marks its lower edge. Surfaces stay flat.
 */
export function ListHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex flex-col gap-3 border-b-[0.5px] border-border bg-background",
        className,
      )}
    >
      {children}
    </div>
  );
}
