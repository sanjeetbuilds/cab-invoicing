import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  Company,
  Invoice,
  InvoiceLine,
} from "@/lib/supabase/types";
import { formatINR, formatINRBlank, formatQty } from "@/lib/format";
import { InvoiceActions } from "./invoice-actions";

export const metadata = { title: "Invoice" };

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

// Single grid template shared between header row and body rows.
const GRID = "64px 82px 50px 1fr 46px 56px 76px";

export default async function InvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const [{ data: invoice }, { data: lines }, { data: company }] = await Promise.all([
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

  const contactLine = [company.phone, company.email].filter(Boolean).join("  ·  ");

  const cgstLabel =
    invoice.gst_mode === "CGST_SGST"
      ? "CGST @ 2.5%"
      : invoice.gst_mode === "RCM"
        ? "CGST @ 2.5% Under RCM"
        : null;
  const sgstLabel =
    invoice.gst_mode === "CGST_SGST"
      ? "SGST @ 2.5%"
      : invoice.gst_mode === "RCM"
        ? "SGST @ 2.5% Under RCM"
        : null;
  const igstLabel = invoice.gst_mode === "IGST" ? "IGST @ 5%" : null;
  const isRcm = invoice.gst_mode === "RCM";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/invoices" className="font-medium text-primary hover:text-primary-hover">
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
      </div>

      <Card>
        <CardContent className="py-7 px-7 text-[12.5px] leading-snug text-foreground">
          {/* Header: stacked company info on left, INVOICE-N + Date right */}
          <div className="flex items-start justify-between gap-6 pb-2.5 border-b border-black">
            <div className="min-w-0">
              <p className="font-semibold text-[15px] tracking-[0.04em]">
                {(company.name ?? "").toUpperCase()}
              </p>
              {contactLine && (
                <p className="mt-1">{contactLine}</p>
              )}
              {company.address && (
                <p className="mt-0.5 whitespace-pre-line">{company.address}</p>
              )}
              {company.gstin && (
                <p className="mt-0.5">GSTIN {company.gstin}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[14px]">INVOICE- {fullNumber}</p>
              <p className="mt-0.5">Date: {fmtDate(invoice.invoice_date)}</p>
            </div>
          </div>

          {/* Bill-to block */}
          <div className="mt-3">
            <p>To- {(invoice.client_name ?? "").toUpperCase()}</p>
            <p className="mt-0.5">
              {invoice.client_gstin ? `GSTIN - ${invoice.client_gstin}` : "GSTIN NA"}
            </p>
            {invoice.client_booked_by && (
              <p className="mt-0.5">Booked By- {invoice.client_booked_by}</p>
            )}
          </div>

          {/* Column headers */}
          <div
            className="grid gap-2 mt-4 pt-1.5 pb-1 border-t border-border/60 border-b border-black text-[10px] font-semibold uppercase tracking-wider"
            style={{ gridTemplateColumns: GRID }}
          >
            <div>Date</div>
            <div>Vehicle / Type</div>
            <div>HSN Code</div>
            <div>Particulars</div>
            <div className="text-right">Units</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Amount</div>
          </div>

          {/* Trip groups */}
          <div className="text-[12px]">
            {groups.map((group, gi) => {
              const vehicle = group.lines[0]?.vehicle_label ?? "";
              const firstDate = group.lines[0]?.date ?? "";
              const hsn = group.lines[0]?.hsn_code ?? "";
              return (
                <div
                  key={group.trip_id ?? `g${gi}`}
                  className={`py-1 ${gi > 0 ? "border-t border-border/40" : ""}`}
                >
                  {group.lines.map((l, li) => {
                    const isFirst = li === 0;
                    return (
                      <div
                        key={l.id}
                        className="grid gap-2 py-px"
                        style={{ gridTemplateColumns: GRID }}
                      >
                        <div className="font-mono text-[11px] whitespace-pre-line">
                          {isFirst ? firstDate : ""}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {isFirst ? vehicle : ""}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {isFirst ? hsn : ""}
                        </div>
                        <div className="whitespace-pre-line">
                          {l.particulars ?? ""}
                        </div>
                        <div className="text-right tabular-nums">
                          {formatQty(l.qty)}
                        </div>
                        <div className="text-right tabular-nums">
                          {formatINRBlank(l.rate)}
                        </div>
                        <div className="text-right tabular-nums">
                          {formatINRBlank(l.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-2 border-t border-black flex justify-end">
            <div className="w-full sm:w-72 flex flex-col gap-0.5 text-[13px]">
              <Row label="Total" value={formatINR(invoice.subtotal)} />
              {cgstLabel && (
                <Row
                  label={cgstLabel}
                  value={isRcm ? "—" : formatINRBlank(invoice.cgst)}
                  muted={isRcm}
                />
              )}
              {sgstLabel && (
                <Row
                  label={sgstLabel}
                  value={isRcm ? "—" : formatINRBlank(invoice.sgst)}
                  muted={isRcm}
                />
              )}
              {igstLabel && (
                <Row label="IGST @ 5%" value={formatINR(invoice.igst)} />
              )}
              {invoice.toll_total !== 0 && (
                <Row
                  label={invoice.toll_label ?? "Toll & Parking"}
                  value={formatINR(invoice.toll_total)}
                />
              )}
              <div className="mt-1 pt-1 border-t border-black flex justify-between font-semibold text-[15px]">
                <span>Net Amount</span>
                <span className="tabular-nums">{formatINR(invoice.net_amount)}</span>
              </div>
            </div>
          </div>

          {/* In words */}
          <p className="mt-3">In Words: {invoice.amount_in_words}</p>

          {/* Footer */}
          <div className="mt-4 text-[11.5px] text-muted-foreground leading-relaxed">
            <p className="text-foreground">E&amp;OE</p>
            {terms.length > 0 && (
              <p className="mt-0.5">
                <span className="text-foreground">TERMS &amp; CONDITIONS :</span>{" "}
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
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className={muted ? "italic text-muted-foreground" : "tabular-nums"}>
        {value}
      </span>
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
