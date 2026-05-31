"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
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
import { hapticDestructive } from "@/lib/haptics";
import type { Trip } from "@/lib/supabase/types";
import { deleteTripAction } from "./actions";

export function TripRowActions({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const locked = trip.invoiced;

  async function onDelete() {
    setDeleting(true);
    const result = await deleteTripAction(trip.id);
    if (result.ok) {
      hapticDestructive();
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
      <div className="flex gap-1 justify-end">
        <Link
          href={locked ? "#" : `/trips/${trip.id}/edit`}
          aria-disabled={locked}
          tabIndex={locked ? -1 : 0}
          aria-label="Edit trip"
          title={locked ? "Invoiced, reverse the invoice first" : "Edit"}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            locked && "pointer-events-none opacity-50",
          )}
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          disabled={locked}
          aria-label="Delete trip"
          title={locked ? "Invoiced, reverse the invoice first" : "Delete"}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

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
