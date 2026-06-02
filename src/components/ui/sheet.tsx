"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Responsive sheet: bottom sheet on mobile, right-side panel on
 * desktop. Built on @base-ui/react Dialog so focus trap, escape to
 * close, and scroll lock come for free.
 *
 * Pass the primary action as `footer`. It renders in a sticky bar
 * pinned to the bottom of the sheet container, so on mobile it
 * stays visible above the soft keyboard, and on desktop it sits at
 * the bottom of the side panel.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  contextLine,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  /** Optional second line under the title, e.g. "Client · Car · Mode". */
  contextLine?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/30 duration-150",
            "data-open:animate-in data-open:fade-in-0",
            "data-closed:animate-out data-closed:fade-out-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed z-50 flex flex-col bg-card shadow-card-hover outline-none",
            // Mobile: bottom sheet that leaves the top of the page
            // visible so the underlying form is not fully hidden.
            "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t border-border",
            "data-open:animate-in data-open:slide-in-from-bottom",
            "data-closed:animate-out data-closed:slide-out-to-bottom",
            // Desktop: right-side panel, full height, 480px wide.
            // Override the rounded corners so the right edge sits
            // flush against the viewport edge.
            "md:inset-y-0 md:right-0 md:left-auto md:top-0 md:bottom-0",
            "md:h-dvh md:max-h-none md:w-[480px] md:max-w-[90vw]",
            "md:rounded-none md:rounded-l-2xl md:border-t-0 md:border-l",
            "md:data-open:slide-in-from-right md:data-closed:slide-out-to-right",
            "duration-200",
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* iOS-style grab handle, mobile only. */}
          <div className="md:hidden flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3 md:pt-5 border-b border-border">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                {title}
              </DialogPrimitive.Title>
              {contextLine && (
                <p className="text-xs text-muted-foreground mt-1">
                  {contextLine}
                </p>
              )}
            </div>
            <DialogPrimitive.Close
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

          {footer && (
            <div className="border-t border-border bg-card px-4 py-3 flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
