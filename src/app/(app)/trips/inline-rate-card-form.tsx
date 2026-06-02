"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { CarType, RateCard } from "@/lib/supabase/types";
import {
  RateBundleEditor,
  type RateBundleEditorHandle,
  type RateBundleSaveResult,
} from "../rate-cards/rate-bundle-editor";

/**
 * Rate-bundle editor opened from inside the trip form. Renders the
 * shared RateBundleEditor inside a Sheet, so the trip draft below
 * stays mounted and intact, and so the markup never puts a <form>
 * inside the outer trip <form>. Save lives in the sheet's sticky
 * footer, always visible above the soft keyboard on mobile.
 *
 * The editor lets the operator add or edit Local + Outstation +
 * any number of named Packages in one go. Saving fans the bundle
 * out across the existing rate-card actions in parallel.
 */
export function InlineRateCardForm({
  open,
  onOpenChange,
  clientId,
  clientName,
  carType,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  carType: CarType;
  /** All rate cards already on file for this (client, car) combo.
   *  Drives the pre-filled values inside the bundle editor. */
  existing: RateCard[];
  /** Called once the save completes with the upserted rate cards
   *  plus any deleted package ids, so the trip form can update its
   *  local rate-cards cache and apply the relevant rate to the
   *  trip in progress. */
  onSaved: (result: RateBundleSaveResult) => void;
}) {
  const editorRef = useRef<RateBundleEditorHandle>(null);
  const [pending, setPending] = useState(false);
  // Bump on each fresh open so the editor remounts and re-seeds its
  // state from `existing`. Without this, switching contexts (e.g.
  // closing then reopening for a different car type) would reuse
  // the previous mount's state.
  const [openSeq, setOpenSeq] = useState(0);
  useEffect(() => {
    if (open) {
      setOpenSeq((n) => n + 1);
      setPending(false);
    }
  }, [open]);

  async function handleSave() {
    if (!editorRef.current) return;
    setPending(true);
    const result = await editorRef.current.save();
    setPending(false);
    if (result === null) return; // toast already raised inside the editor
    if (result.saved.length === 0 && result.deletedIds.length === 0) {
      // Nothing was filled. Keep the sheet open so the user can fill.
      return;
    }
    onSaved(result);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Set rates"
      contextLine={
        <>
          <span className="font-medium text-foreground/80">{clientName}</span>
          {" · "}
          <span className="font-medium text-foreground/80">{carType}</span>
        </>
      }
      footer={
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save and apply
        </Button>
      }
    >
      <RateBundleEditor
        key={openSeq}
        ref={editorRef}
        clientId={clientId}
        clientName={clientName}
        carType={carType}
        existing={existing}
      />
    </Sheet>
  );
}
