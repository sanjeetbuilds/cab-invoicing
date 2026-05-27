import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  Company,
  Invoice,
  InvoiceLine,
} from "@/lib/supabase/types";
import { InvoiceActions } from "./invoice-actions";

export const metadata = { title: "Invoice — Krishna Cabs" };

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

export default async function InvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const [
    { data: invoice },
    { data: lines },
    { data: company },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Invoice>(),
    supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true })
      .returns<InvoiceLine[]>(),
    supabase
      .from("companies")
      .select("*")
      .eq("id", membership.company_id)
      .maybeSingle<Company>(),
  ]);

  if (!invoice || !company) notFound();

  const lineList = lines ?? [];
  const fullNumber = `${company.invoice_prefix ?? ""}${invoice.invoice_number}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/invoices" className="underline">← Invoices</Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            Invoice {fullNumber}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={invoice.status} />
            <span className="text-sm text-muted-foreground">
              Issued {fmtDate(invoice.invoice_date)}
            </span>
          </div>
        </div>
        <InvoiceActions invoice={invoice} />
      </div>

      <Card>
        <CardContent className="py-6">
          {/* Header band */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
              <p className="font-semibold mt-1">{company.name}</p>
              {company.address && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {company.address}
                </p>
              )}
              {company.gstin && (
                <p className="text-xs mt-1">GSTIN: <span className="font-mono">{company.gstin}</span></p>
              )}
              <p className="text-xs">State: {company.state}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">To</p>
              <p className="font-semibold mt-1">{invoice.client_name}</p>
              {invoice.client_address && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {invoice.client_address}
                </p>
              )}
              {invoice.client_gstin && (
                <p className="text-xs mt-1">GSTIN: <span className="font-mono">{invoice.client_gstin}</span></p>
              )}
              {invoice.client_booked_by && (
                <p className="text-xs">Booked by: {invoice.client_booked_by}</p>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <Meta label="Invoice no." value={fullNumber} />
            <Meta label="Date" value={fmtDate(invoice.invoice_date)} />
            <Meta
              label="Period"
              value={
                invoice.period_from && invoice.period_to
                  ? `${fmtDate(invoice.period_from)} – ${fmtDate(invoice.period_to)}`
                  : "—"
              }
            />
          </div>

          <Separator className="my-6" />

          {/* Lines */}
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineList.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{l.date ?? ""}</TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{l.vehicle_label ?? ""}</TableCell>
                    <TableCell className="font-mono text-xs">{l.hsn_code ?? ""}</TableCell>
                    <TableCell className="whitespace-pre-line">{l.particulars ?? ""}</TableCell>
                    <TableCell className="text-right font-mono">{l.qty ?? ""}</TableCell>
                    <TableCell className="text-right font-mono">
                      {l.rate != null ? fmtINR(l.rate) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(l.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-80 flex flex-col gap-1 text-sm">
              <Row label="Subtotal" value={fmtINR(invoice.subtotal)} />
              {invoice.gst_mode === "CGST_SGST" && (
                <>
                  <Row label="CGST @ 2.5%" value={fmtINR(invoice.cgst)} />
                  <Row label="SGST @ 2.5%" value={fmtINR(invoice.sgst)} />
                </>
              )}
              {invoice.gst_mode === "IGST" && (
                <Row label="IGST @ 5%" value={fmtINR(invoice.igst)} />
              )}
              {invoice.gst_mode === "RCM" && (
                <>
                  <Row label="CGST @ 2.5% Under RCM" value={fmtINR(0)} />
                  <Row label="SGST @ 2.5% Under RCM" value={fmtINR(0)} />
                </>
              )}
              <Row label="Toll" value={fmtINR(invoice.toll_total)} />
              <Separator className="my-1" />
              <div className="flex justify-between font-medium text-base">
                <span>Net amount</span>
                <span className="font-mono">{fmtINR(invoice.net_amount)}</span>
              </div>
              <p className="mt-1 text-xs italic text-muted-foreground">
                {invoice.amount_in_words}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono mt-0.5">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  switch (status) {
    case "paid":
      return <Badge>Paid</Badge>;
    case "unpaid":
      return <Badge variant="secondary">Unpaid</Badge>;
    case "reversed":
      return <Badge variant="outline" className="text-muted-foreground">Reversed</Badge>;
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
  }
}
