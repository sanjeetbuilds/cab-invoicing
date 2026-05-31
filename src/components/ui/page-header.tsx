import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard page header. Mobile: smaller title, hidden subtitle, action
 * button sits inline with the title, the goal is to keep the first
 * content row of the page above the fold on a typical phone. Desktop:
 * larger title with subtitle for context.
 */
export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {description && (
          <p className="hidden sm:block mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
