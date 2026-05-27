"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

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
import type { Client } from "@/lib/supabase/types";
import { ClientFormDialog } from "./client-form-dialog";
import { deleteClientAction } from "./actions";

export function ClientRowActions({ client }: { client: Client }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    const result = await deleteClientAction(client.id);
    if (result.ok) {
      toast.success(`${client.name} deleted.`);
      setConfirmDelete(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setDeleting(false);
  }

  return (
    <>
      <div className="flex gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setEditOpen(true)}
          aria-label={`Edit ${client.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          aria-label={`Delete ${client.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also delete every rate card and quotation linked to{" "}
              <strong>{client.name}</strong>. Trips and invoices that reference
              this client will be blocked from deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
