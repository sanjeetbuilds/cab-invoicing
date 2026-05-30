"use client";

import { FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import type { Company, Invoice } from "@/lib/supabase/types";

// Desktop: iframe pointing at /api/invoices/:id/pdf — the browser's
// built-in PDF viewer handles multi-page scroll natively.
// Mobile: iframe PDF embeds clip to a single page on Chrome/Safari (the
// embed gets the iframe's height but the viewer doesn't expose scroll
// controls), so we don't try. Render a summary card + a big "Open PDF"
// button that hands off to the phone's native PDF viewer instead —
// same pattern as Zoho/Razorpay/Stripe receipt screens.
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

interface Props {
  invoice: Invoice;
  company: Pick<Company, "invoice_prefix">;
  lineCount: number;
}

export function InvoicePreview({ invoice, company, lineCount }: Props) {
  const fullNumber = `${company.invoice_prefix ?? ""}${invoice.invoice_number}`;
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;

  return (
    <>
      {/* Mobile: summary + Open PDF button */}
      <div className="md:hidden flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Billed to
            </p>
            <p className="font-semibold leading-tight">
              {invoice.client_name ?? "—"}
            </p>
            {invoice.client_gstin && (
              <p className="font-mono text-xs text-muted-foreground">
                GSTIN {invoice.client_gstin}
              </p>
            )}
          </div>

          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Net amount
            </span>
            <span className="text-2xl font-semibold font-mono tabular-nums">
              {formatINR(invoice.net_amount)}
            </span>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Invoice</dt>
            <dd className="font-mono text-right">{fullNumber}</dd>
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-mono text-right">
              {fmtDate(invoice.invoice_date)}
            </dd>
            {invoice.period_from && invoice.period_to && (
              <>
                <dt className="text-muted-foreground">Period</dt>
                <dd className="font-mono text-right">
                  {fmtDate(invoice.period_from)} – {fmtDate(invoice.period_to)}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Line items</dt>
            <dd className="font-mono text-right">{lineCount}</dd>
          </dl>
        </div>

        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "default" }) + " h-12 text-base"}
        >
          <FileText className="size-5" />
          Open PDF
        </a>

        <p className="text-center text-xs text-muted-foreground">
          Opens in your phone&apos;s PDF viewer. Use the share / save icon there
          to download.
        </p>
      </div>

      {/* Desktop: iframe with the actual PDF inline */}
      <iframe
        src={`${pdfUrl}?fresh=1#toolbar=0&navpanes=0`}
        title="Invoice preview"
        className="hidden md:block w-full h-[900px] rounded-lg border border-border bg-muted/30"
      />
    </>
  );
}
