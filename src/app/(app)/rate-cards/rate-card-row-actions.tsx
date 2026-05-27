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
import type { Client, RateCard } from "@/lib/supabase/types";
import { RateCardFormDialog } from "./rate-card-form-dialog";
import { deleteRateCardAction } from "./actions";

export function RateCardRowActions({
  rateCard,
  clients,
}: {
  rateCard: RateCard;
  clients: Pick<Client, "id" | "name">[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    const result = await deleteRateCardAction(rateCard.id);
    if (result.ok) {
      toast.success("Rate card deleted.");
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
          aria-label="Edit rate card"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          aria-label="Delete rate card"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <RateCardFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        rateCard={rateCard}
        clients={clients}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rate card?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing invoices already use snapshots — they won&apos;t change.
              Future trips that match this (client, car type, mode) won&apos;t
              have an active rate until you add one.
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
