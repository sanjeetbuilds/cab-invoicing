"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRegisterSaveBar } from "./app-shell-context";

/**
 * Sticky bottom action bar for every form. Always-visible Save and
 * Cancel, kept above the iPhone home indicator with safe-area padding.
 * On mobile, mounting this bar hides the bottom nav (Rule 4 collision
 * rule) so the two never share the same row.
 *
 * Two ways to wire it up:
 *   - `formId` for an actual <form id="..."> elsewhere on the page; the
 *     Save button becomes type="submit" and triggers that form's
 *     onSubmit handler.
 *   - `onSave` callback for forms that submit through other means.
 */
export function SaveBar({
  formId,
  onSave,
  onCancel,
  canSave = true,
  pending = false,
  saveLabel = "Save",
  savingLabel = "Saving...",
  cancelLabel = "Cancel",
  hideCancel = false,
}: {
  formId?: string;
  onSave?: () => void;
  onCancel?: () => void;
  canSave?: boolean;
  pending?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
}) {
  useRegisterSaveBar();

  const disabled = !canSave || pending;

  return (
    <div
      className={cn(
        // Spans full width on mobile, offset by the 240 px sidebar on
        // lg+ so it doesn't overlap the nav column.
        "fixed bottom-0 right-0 left-0 lg:left-60 z-40",
        "border-t border-border bg-card/95 backdrop-blur",
        "supports-[backdrop-filter]:bg-card/80",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-screen-2xl flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        {!hideCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
        ) : (
          <span />
        )}

        <Button
          type={formId ? "submit" : "button"}
          form={formId}
          onClick={formId ? undefined : onSave}
          disabled={disabled}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Spacer placed at the bottom of a form's scroll area so the last
 * field is never hidden behind the fixed Save bar. Roughly matches the
 * Save bar's height (12 px y-padding * 2 + ~36 px button height) plus
 * a comfortable visual gap.
 */
export function SaveBarSpacer() {
  return <div aria-hidden className="h-24 sm:h-20" />;
}
