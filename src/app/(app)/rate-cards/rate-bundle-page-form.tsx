"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { SaveBar, SaveBarSpacer } from "@/components/shell/save-bar";
import type { CarType, Client, RateCard } from "@/lib/supabase/types";
import {
  RateBundleEditor,
  type RateBundleEditorHandle,
} from "./rate-bundle-editor";

/**
 * Page wrapper around RateBundleEditor used by /rate-cards/new and
 * /rate-cards/[id]/edit. Renders the editor inside a card and
 * wires its save method to the standard sticky SaveBar so the
 * primary action stays in the same place every form on this app
 * uses.
 */
export function RateBundlePageForm({
  clientId,
  clientName,
  carType,
  clients,
  existing,
}: {
  /** Pre-selected client. When undefined, the editor surfaces its
   *  own client picker (the /rate-cards/new flow without a query
   *  param). */
  clientId?: string;
  clientName?: string;
  /** Pre-selected car type. When undefined, the editor surfaces
   *  its own car-type picker. */
  carType?: CarType;
  /** Required when clientId is undefined so the picker has rows. */
  clients?: Pick<Client, "id" | "name">[];
  /** Existing rate_cards rows for the (client, car) combo. */
  existing: RateCard[];
}) {
  const router = useRouter();
  const ref = useRef<RateBundleEditorHandle>(null);
  const [pending, setPending] = useState(false);

  async function onSave() {
    if (!ref.current) return;
    setPending(true);
    const result = await ref.current.save();
    setPending(false);
    if (!result) return; // toast already raised inside the editor
    router.push("/rate-cards");
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardContent>
          <RateBundleEditor
            ref={ref}
            clientId={clientId}
            clientName={clientName}
            carType={carType}
            clients={clients}
            existing={existing}
          />
        </CardContent>
      </Card>

      <SaveBarSpacer />
      <SaveBar
        onSave={onSave}
        pending={pending}
        alwaysShow
        onCancel={() => router.push("/rate-cards")}
        saveLabel="Save rates"
      />
    </>
  );
}
