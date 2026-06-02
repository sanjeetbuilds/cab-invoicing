import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plain header block for every list page. Holds the title, action
 * buttons, and any filter chrome (search input, filter button, status
 * pills), stacked vertically with gap-3.
 *
 * Nothing here is sticky or pinned. The whole page is one normal
 * scroll, so rows never slide behind a fixed header. Surfaces stay
 * flat on the neutral background.
 */
export function ListHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>{children}</div>
  );
}
