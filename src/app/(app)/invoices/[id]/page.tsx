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
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtAmount(n: number | null | undefined): string {
  if (n == null || n === 0) return "";
  return fmtINR(Number(n));
}

function fmtQty(n: number | null | undefined): string {
  if (n == null) return "";
  return fmtINR(Number(n));
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

interface LineGroup {
  trip_id: string | null;
  lines: InvoiceLine[];
}

function groupLines(lines: InvoiceLine[]): LineGroup[] {
  const groups: LineGroup[] = [];
  let current: LineGroup | null = null;
  for (const line of lines) {
    if (!current || current.trip_id !== line.trip_id) {
      current = { trip_id: line.trip_id, lines: [] };
      groups.push(current);
    }
    current.lines.push(line);
  }
  return groups;
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
  const groups = groupLines(lineList);
  const terms = (company.terms_invoice ?? []).filter(Boolean);

  const cgstShow = invoice.gst_mode === "CGST_SGST" || invoice.gst_mode === "RCM";
  const sgstShow = cgstShow;
  const igstShow = invoice.gst_mode === "IGST";
  const isRcm = invoice.gst_mode === "RCM";

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
        <CardContent className="py-6 px-6">
          {/* 3-column letterhead */}
          <div className="grid grid-cols-12 gap-4 pb-3 border-b border-black">
            {/* Col 1 — Company */}
            <div className="col-span-12 sm:col-span-4">
              <p className="font-bold text-base tracking-wide">
                {(company.name ?? "").toUpperCase()}
              </p>
              {company.phone && (
                <p className="text-xs mt-1">{company.phone}</p>
              )}
              {company.email && (
                <p className="text-xs">{company.email}</p>
              )}
              {company.address && (
                <p className="text-xs mt-2 whitespace-pre-line">{company.address}</p>
              )}
            </div>

            {/* Col 2 — Bill to */}
            <div className="col-span-12 sm:col-span-5">
              <p className="font-semibold text-sm">
                To- {(invoice.client_name ?? "").toUpperCase()}
              </p>
              {invoice.client_address && (
                <p className="text-xs mt-1 whitespace-pre-line">
                  {invoice.client_address}
                </p>
              )}
              <p className="text-xs mt-1">
                {invoice.client_gstin ? `GSTIN ${invoice.client_gstin}` : "GSTIN NA"}
              </p>
              {invoice.client_booked_by && (
                <p className="text-xs mt-2">Booked By- {invoice.client_booked_by}</p>
              )}
            </div>

            {/* Col 3 — GSTIN + invoice meta */}
            <div className="col-span-12 sm:col-span-3 text-right">
              {company.gstin && (
                <p className="text-xs font-bold mb-3">GSTIN {company.gstin}</p>
              )}
              <p className="font-bold">INVOICE- {fullNumber}</p>
              <p className="text-xs mt-1">Date: {fmtDate(invoice.invoice_date)}</p>
            </div>
          </div>

          {/* Lines table */}
          <div className="mt-4 rounded-sm border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Date</TableHead>
                  <TableHead className="w-[120px]">Vehicle Type</TableHead>
                  <TableHead className="w-[68px]">HSN Code</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="w-[64px] text-right">Qty</TableHead>
                  <TableHead className="w-[72px] text-right">Rate</TableHead>
                  <TableHead className="w-[90px] text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group, gi) => (
                  group.lines.map((l, li) => {
                    const isFirst = li === 0;
                    return (
                      <TableRow
                        key={l.id}
                        className={isFirst && gi > 0 ? "border-t-2" : ""}
                      >
                        <TableCell className="font-mono text-xs whitespace-nowrap align-top">
                          {isFirst ? (l.date ?? "") : ""}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap align-top">
                          {isFirst ? (l.vehicle_label ?? "") : ""}
                        </TableCell>
                        <TableCell className="font-mono text-xs align-top">
                          {isFirst ? (l.hsn_code ?? "") : ""}
                        </TableCell>
                        <TableCell className="whitespace-pre-line align-top">
                          {l.particulars ?? ""}
                        </TableCell>
                        <TableCell className="text-right font-mono align-top">
                          {fmtQty(l.qty)}
                        </TableCell>
                        <TableCell className="text-right font-mono align-top">
                          {fmtAmount(l.rate)}
                        </TableCell>
                        <TableCell className="text-right font-mono align-top">
                          {fmtAmount(l.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ))}
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-right font-semibold border-t-2 border-black"
                  >
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold border-t-2 border-black">
                    {fmtINR(invoice.subtotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Totals block right-aligned */}
          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-80 flex flex-col gap-1 text-sm">
              {cgstShow && (
                <Row
                  label="CGST @ 2.5%"
                  value={isRcm ? "Under RCM" : fmtINR(invoice.cgst)}
                  italic={isRcm}
                />
              )}
              {sgstShow && (
                <Row
                  label="SGST @ 2.5%"
                  value={isRcm ? "Under RCM" : fmtINR(invoice.sgst)}
                  italic={isRcm}
                />
              )}
              {igstShow && (
                <Row label="IGST @ 5%" value={fmtINR(invoice.igst)} />
              )}
              <Row label="Toll & Parking" value={fmtINR(invoice.toll_total)} />
              <Separator className="my-1 bg-black" />
              <div className="flex justify-between font-bold text-base">
                <span>Net Amount</span>
                <span className="font-mono">{fmtINR(invoice.net_amount)}</span>
              </div>
            </div>
          </div>

          {/* In words */}
          <div className="mt-6 pt-3 border-t text-sm">
            <span className="font-semibold">In Words:</span> {invoice.amount_in_words}
          </div>

          {/* Footer: E&OE + terms */}
          <div className="mt-6 pt-3 border-t text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">E&amp;OE</p>
            {terms.length > 0 && (
              <p className="mt-1">
                <span className="font-semibold text-foreground">TERMS &amp; CONDITIONS :</span>{" "}
                {terms[0]}
              </p>
            )}
            {terms.slice(1).map((t, i) => (
              <p key={i} className="mt-0.5">{t}</p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  italic = false,
}: {
  label: string;
  value: string;
  italic?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={italic ? "italic text-muted-foreground" : "font-mono"}>
        {value}
      </span>
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
