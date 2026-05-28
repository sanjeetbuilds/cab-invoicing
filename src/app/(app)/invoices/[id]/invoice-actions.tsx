"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Download, RotateCcw, Undo2 } from "lucide-react";

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
import type { Invoice } from "@/lib/supabase/types";
import { markInvoicePaidAction, reverseInvoiceAction } from "../actions";

export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [confirmReverse, setConfirmReverse] = useState(false);
  const [pending, setPending] = useState(false);

  async function onReverse() {
    setPending(true);
    const result = await reverseInvoiceAction({ id: invoice.id });
    setPending(false);
    if (result.ok) {
      toast.success("Invoice reversed. Trips are back on the open list.");
      setConfirmReverse(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onTogglePaid(paid: boolean) {
    setPending(true);
    const result = await markInvoicePaidAction({ id: invoice.id, paid });
    setPending(false);
    if (result.ok) {
      toast.success(paid ? "Marked paid." : "Marked unpaid.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const reversed = invoice.status === "reversed";
  const paid = invoice.status === "paid";

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          <Download className="h-4 w-4" />
          PDF
        </a>
        {!reversed && !paid && (
          <Button onClick={() => onTogglePaid(true)} disabled={pending}>
            <Check className="h-4 w-4" />
            Mark paid
          </Button>
        )}
        {!reversed && paid && (
          <Button
            variant="outline"
            onClick={() => onTogglePaid(false)}
            disabled={pending}
          >
            <Undo2 className="h-4 w-4" />
            Mark unpaid
          </Button>
        )}
        {!reversed && (
          <Button
            variant="outline"
            onClick={() => setConfirmReverse(true)}
            disabled={pending}
          >
            <RotateCcw className="h-4 w-4" />
            Reverse
          </Button>
        )}
      </div>

      <AlertDialog open={confirmReverse} onOpenChange={setConfirmReverse}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Invoice <strong>#{invoice.invoice_number}</strong> will be marked
              reversed and its trips will return to the open list so you can
              re-invoice them. The invoice number stays reserved and is never
              reused.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onReverse} disabled={pending}>
              {pending ? "Reversing…" : "Reverse"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
