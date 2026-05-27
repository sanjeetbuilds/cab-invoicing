"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Client, RateCard, Vehicle } from "@/lib/supabase/types";
import { TripFormDialog } from "./trip-form-dialog";

export function AddTripButton({
  clients,
  vehicles,
  rateCards,
  disabled,
}: {
  clients: Pick<Client, "id" | "name">[];
  vehicles: Pick<Vehicle, "id" | "number" | "type" | "active">[];
  rateCards: RateCard[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="h-4 w-4" />
        Log trip
      </Button>
      <TripFormDialog
        open={open}
        onOpenChange={setOpen}
        clients={clients}
        vehicles={vehicles}
        rateCards={rateCards}
      />
    </>
  );
}
