"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Single sticky header container for every list page. Sits below
 * the TopBar (h-11 mobile, h-12 sm+), has a solid opaque
 * background and a hairline bottom border, so rows scrolling
 * underneath never show through. Spans the full main scroll-area
 * width via negative horizontal margins that cancel the page
 * gutter.
 *
 * Only one of these per page. Put the title, action buttons, and
 * any filter chrome (search input, filter button, status pills)
 * as children, stacked vertically with gap-3.
 */
export function ListSticky({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-11 sm:top-12 z-20",
        "-mx-4 sm:-mx-6 -mt-4 sm:-mt-8 mb-2 px-4 sm:px-6 py-3",
        "bg-background border-b border-border",
        "flex flex-col gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
