"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Mobile bottom-sheet pattern — slides up from the bottom edge of the
 * viewport, dim backdrop, tap-outside or X to close. Wraps base-ui's
 * Dialog so focus trapping + escape-to-close + scroll lock are free.
 *
 * On desktop (md+) the parent should typically render its content
 * inline instead of using this sheet — so this component is meant to
 * be conditionally rendered (e.g. only shown on small viewports).
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
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
            "fixed inset-x-0 bottom-0 z-50 flex flex-col",
            "max-h-[80vh] rounded-t-2xl border-t border-border bg-card",
            "shadow-card duration-200",
            "data-open:animate-in data-open:slide-in-from-bottom",
            "data-closed:animate-out data-closed:slide-out-to-bottom",
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* iOS-style grab handle. Decorative; the X is the real
              dismiss target. */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
            <DialogPrimitive.Title className="text-sm font-semibold">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

          {footer && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
