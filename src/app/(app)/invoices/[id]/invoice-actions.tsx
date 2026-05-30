"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, RotateCcw, Undo2 } from "lucide-react";

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
import { formatINR } from "@/lib/format";
import type { Invoice } from "@/lib/supabase/types";
import { markInvoicePaidAction, reverseInvoiceAction } from "../actions";

export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmReverse, setConfirmReverse] = useState(false);
  const [confirmPaid, setConfirmPaid] = useState<null | "mark" | "unmark">(
    null,
  );

  const reversed = invoice.status === "reversed";
  const paid = invoice.status === "paid";

  async function onTogglePaid(toPaid: boolean) {
    setPending(true);
    const result = await markInvoicePaidAction({ id: invoice.id, paid: toPaid });
    setPending(false);
    if (result.ok) {
      toast.success(toPaid ? "Marked paid." : "Marked unpaid.");
      setConfirmPaid(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

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

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {!reversed && !paid && (
          <Button
            onClick={() => setConfirmPaid("mark")}
            disabled={pending}
            className="flex-1 sm:flex-initial"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Mark paid
          </Button>
        )}
        {!reversed && paid && (
          <Button
            variant="outline"
            onClick={() => setConfirmPaid("unmark")}
            disabled={pending}
            className="flex-1 sm:flex-initial"
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
            className="flex-1 sm:flex-initial"
          >
            <RotateCcw className="h-4 w-4" />
            Reverse
          </Button>
        )}
      </div>

      <AlertDialog
        open={confirmPaid !== null}
        onOpenChange={(o) => !o && setConfirmPaid(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmPaid === "mark" ? "Mark as paid?" : "Mark as unpaid?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{invoice.client_name}</strong> · {formatINR(invoice.net_amount)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onTogglePaid(confirmPaid === "mark")}
              disabled={pending}
            >
              {pending
                ? "Saving…"
                : confirmPaid === "mark"
                  ? "Mark paid"
                  : "Mark unpaid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
