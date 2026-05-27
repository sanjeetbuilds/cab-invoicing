"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "./client-form-dialog";

export function AddClientButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add client
      </Button>
      <ClientFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
