"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleFormDialog } from "./vehicle-form-dialog";

export function AddVehicleButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add vehicle
      </Button>
      <VehicleFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
