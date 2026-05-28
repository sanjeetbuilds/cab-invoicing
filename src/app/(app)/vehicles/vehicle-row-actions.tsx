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
import type { Vehicle } from "@/lib/supabase/types";
import { deleteVehicleAction } from "./actions";

export function VehicleRowActions({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    const result = await deleteVehicleAction(vehicle.id);
    if (result.ok) {
      toast.success(`${vehicle.number} deleted.`);
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
          href={`/vehicles/${vehicle.id}/edit`}
          aria-label={`Edit ${vehicle.number}`}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          aria-label={`Delete ${vehicle.number}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{vehicle.number}</strong> ({vehicle.type}) will be
              removed. Trips that reference it will be blocked from deletion.
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
