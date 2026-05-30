import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import type { Company, Invoice } from "@/lib/supabase/types";
import { InvoiceActions } from "./invoice-actions";

export const metadata = { title: "Invoice" };

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const [
    { data: invoice },
    { data: company },
    { data: tripRefs },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Invoice>(),
    supabase
      .from("companies")
      .select("invoice_prefix")
      .eq("id", membership.company_id)
      .maybeSingle<Pick<Company, "invoice_prefix">>(),
    supabase
      .from("invoice_lines")
      .select("trip_id")
      .eq("invoice_id", id)
      .returns<{ trip_id: string | null }[]>(),
  ]);

  if (!invoice || !company) notFound();

  const fullNumber = `${company.invoice_prefix ?? ""}${invoice.invoice_number}`;
  const duties = new Set(
    (tripRefs ?? []).map((r) => r.trip_id).filter(Boolean),
  ).size;
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-5">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/invoices"
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Invoices
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          Invoice {fullNumber}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={invoice.status} />
          <span className="text-sm text-muted-foreground">
            Issued {fmtDate(invoice.invoice_date)}
          </span>
          {invoice.status === "paid" && invoice.paid_date && (
            <span className="text-sm text-muted-foreground">
              · Paid {fmtDate(invoice.paid_date)}
            </span>
          )}
        </div>
      </div>

      <InvoiceActions invoice={invoice} />

      <Card>
        <CardContent className="py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Billed to
            </p>
            <p className="text-lg font-semibold leading-tight">
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

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
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
            <dt className="text-muted-foreground">Duties</dt>
            <dd className="font-mono text-right">{duties || "—"}</dd>
          </dl>
        </CardContent>
      </Card>

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
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  switch (status) {
    case "paid":
      return <Badge variant="success">Paid</Badge>;
    case "unpaid":
      return <Badge variant="warning">Unpaid</Badge>;
    case "reversed":
      return <Badge variant="ghost">Reversed</Badge>;
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
  }
}
