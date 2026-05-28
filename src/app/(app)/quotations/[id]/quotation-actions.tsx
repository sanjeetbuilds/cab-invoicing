"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";

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
import type { QuotationStatus } from "@/lib/supabase/types";
import {
  acceptQuotationAction,
  deleteQuotationAction,
} from "../actions";

export function QuotationActions({
  quotationId,
  number,
  status,
}: {
  quotationId: string;
  number: string;
  status: QuotationStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onAccept() {
    setPending(true);
    const result = await acceptQuotationAction(quotationId);
    setPending(false);
    if (result.ok) {
      toast.success("Quotation accepted — rate cards upserted.");
      setConfirmAccept(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onDelete() {
    setPending(true);
    const result = await deleteQuotationAction(quotationId);
    setPending(false);
    if (result.ok) {
      toast.success(`Quotation ${number} deleted.`);
      router.push("/quotations");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      {status !== "accepted" && (
        <Button onClick={() => setConfirmAccept(true)} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Accept &amp; create rate cards
        </Button>
      )}
      <Button
        variant="outline"
        onClick={() => setConfirmDelete(true)}
        disabled={pending}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
        Delete
      </Button>

      <AlertDialog open={confirmAccept} onOpenChange={setConfirmAccept}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              The rate lines on quotation <strong>{number}</strong> will be
              upserted into rate cards for this client (creating the client
              first if the quotation only has snapshot fields). Existing rate
              cards for the same (car, mode) are overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onAccept} disabled={pending}>
              {pending ? "Accepting…" : "Accept"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              Quotation <strong>{number}</strong> will be removed. Rate cards
              created from accepting it stay in place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
