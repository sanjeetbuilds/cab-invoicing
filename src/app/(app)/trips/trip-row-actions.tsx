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
import type { Client, RateCard, Trip, Vehicle } from "@/lib/supabase/types";
import { TripFormDialog } from "./trip-form-dialog";
import { deleteTripAction } from "./actions";

export function TripRowActions({
  trip,
  clients,
  vehicles,
  rateCards,
}: {
  trip: Trip;
  clients: Pick<Client, "id" | "name">[];
  vehicles: Pick<Vehicle, "id" | "number" | "type" | "active">[];
  rateCards: RateCard[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const locked = trip.invoiced;

  async function onDelete() {
    setDeleting(true);
    const result = await deleteTripAction(trip.id);
    if (result.ok) {
      toast.success("Trip deleted.");
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
          disabled={locked}
          aria-label="Edit trip"
          title={locked ? "Invoiced — reverse the invoice first" : "Edit"}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          disabled={locked}
          aria-label="Delete trip"
          title={locked ? "Invoiced — reverse the invoice first" : "Delete"}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <TripFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        trip={trip}
        clients={clients}
        vehicles={vehicles}
        rateCards={rateCards}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              Trip on <strong>{trip.date}</strong> will be removed. This cannot
              be undone.
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
