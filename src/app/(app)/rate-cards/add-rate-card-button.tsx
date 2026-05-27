"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Client } from "@/lib/supabase/types";
import { RateCardFormDialog } from "./rate-card-form-dialog";

export function AddRateCardButton({
  clients,
  defaultClientId,
  label = "Add rate card",
  variant = "default",
  size = "default",
}: {
  clients: Pick<Client, "id" | "name">[];
  defaultClientId?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} variant={variant} size={size}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <RateCardFormDialog
        open={open}
        onOpenChange={setOpen}
        clients={clients}
        defaultClientId={defaultClientId}
      />
    </>
  );
}
