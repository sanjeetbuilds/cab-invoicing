"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useRegisterSaveBar } from "./app-shell-context";

/**
 * Sticky bottom action bar for every form.
 *
 * Hidden until the user actually edits something (dirty = true). The
 * moment a field changes, the bar slides in, the BottomNav slides out
 * (Rule 4 collision rule), and Save activates. On a successful save
 * the form resets to clean and the bar disappears again.
 *
 * Discard guard: if the user tries to leave (browser back, tab close)
 * while dirty, the beforeunload prompt fires. The Cancel button shows
 * an explicit "Discard your changes?" dialog.
 *
 * Two ways to wire Save:
 *   - `formId` for an actual <form id="..."> elsewhere on the page;
 *     the Save button becomes type="submit" and triggers that form's
 *     onSubmit handler.
 *   - `onSave` callback for forms that submit through other means.
 */
export function SaveBar({
  formId,
  onSave,
  onCancel,
  leading,
  alwaysShow = false,
  dirty = true,
  canSave = true,
  pending = false,
  saveLabel = "Save",
  savingLabel = "Saving...",
  cancelLabel = "Cancel",
  hideCancel = false,
  secondaryLabel,
  onSecondary,
  secondaryPending = false,
}: {
  formId?: string;
  onSave?: () => void;
  onCancel?: () => void;
  /**
   * Optional left-side content rendered in the bar. Used by the trip
   * form to show the running Trip total on the left while Cancel
   * and Save group on the right. When unset the bar falls back to
   * the original Cancel-left / Save-right two-column layout.
   */
  leading?: React.ReactNode;
  /**
   * If true, the bar renders regardless of dirty state. Used on the
   * trip form so the running Trip total in `leading` stays visible
   * at all times. dirty still drives beforeunload + discard prompt.
   */
  alwaysShow?: boolean;
  /** True when the form has unsaved changes. The bar hides when false. */
  dirty?: boolean;
  canSave?: boolean;
  pending?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  /** Optional second button left of Save, e.g. "Save as draft". */
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryPending?: boolean;
}) {
  // Only render the bar (and register with the shell context) when
  // there's something to save or a save is in flight. While clean we
  // stay out of the DOM so BottomNav can keep its slot. alwaysShow
  // opts a form into a persistent bar.
  const visible = alwaysShow || dirty || pending;
  if (!visible) return null;

  return (
    <SaveBarBody
      formId={formId}
      onSave={onSave}
      onCancel={onCancel}
      leading={leading}
      dirty={dirty}
      canSave={canSave}
      pending={pending}
      saveLabel={saveLabel}
      savingLabel={savingLabel}
      cancelLabel={cancelLabel}
      hideCancel={hideCancel}
      secondaryLabel={secondaryLabel}
      onSecondary={onSecondary}
      secondaryPending={secondaryPending}
    />
  );
}

function SaveBarBody({
  formId,
  onSave,
  onCancel,
  leading,
  dirty,
  canSave,
  pending,
  saveLabel,
  savingLabel,
  cancelLabel,
  hideCancel,
  secondaryLabel,
  onSecondary,
  secondaryPending,
}: {
  formId?: string;
  onSave?: () => void;
  onCancel?: () => void;
  leading?: React.ReactNode;
  dirty: boolean;
  canSave: boolean;
  pending: boolean;
  saveLabel: string;
  savingLabel: string;
  cancelLabel: string;
  hideCancel: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryPending?: boolean;
}) {
  useRegisterSaveBar();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Browser-level guard: tab close / page reload while dirty triggers
  // the standard "Leave site?" prompt. Doesn't catch in-app Link
  // clicks (App Router has no public API for that yet), but the
  // Cancel button handles the explicit-leave path below.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function handleCancelClick() {
    if (!onCancel) return;
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      onCancel();
    }
  }

  const disabled = !canSave || pending;

  return (
    <>
      <div
        className={cn(
          // Spans full width on mobile, offset by the 240 px sidebar
          // on lg+ so it doesn't overlap the nav column.
          "fixed bottom-0 right-0 left-0 lg:left-60 z-40",
          "border-t border-border bg-card/95 backdrop-blur",
          "supports-[backdrop-filter]:bg-card/80",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto max-w-screen-2xl flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          {/* Left slot.
              - When `leading` is provided (e.g. trip total), it sits
                on the far left and Cancel slides over next to Save.
              - Otherwise Cancel keeps the historical left position so
                every other form looks the way it did before. */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            {leading
              ? leading
              : !hideCancel && onCancel
                ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancelClick}
                      disabled={pending}
                    >
                      {cancelLabel}
                    </Button>
                  )
                : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {leading && !hideCancel && onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelClick}
                disabled={pending}
              >
                {cancelLabel}
              </Button>
            )}
            {secondaryLabel && onSecondary && (
              <Button
                type="button"
                variant="outline"
                onClick={onSecondary}
                disabled={pending || secondaryPending}
              >
                {secondaryPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {secondaryLabel}
              </Button>
            )}
            <Button
              type={formId ? "submit" : "button"}
              form={formId}
              onClick={formId ? undefined : onSave}
              disabled={disabled || secondaryPending}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? savingLabel : saveLabel}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog
        open={confirmDiscard}
        onOpenChange={(o) => !o && setConfirmDiscard(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              The edits you made on this screen will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onCancel?.();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Spacer kept at the bottom of each form for backward compatibility.
 * The (app) layout's main element now reserves enough bottom padding
 * for either the BottomNav or the SaveBar (they never both show), so
 * this is mostly a no-op now. Keep it so existing forms compile.
 */
export function SaveBarSpacer() {
  return <div aria-hidden className="h-4" />;
}
