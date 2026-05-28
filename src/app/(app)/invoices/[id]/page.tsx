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

function splitVehicleLabel(label: string | null | undefined): {
  vehicle: string;
  type: string;
} {
  if (!label) return { vehicle: "", type: "" };
  const i = label.lastIndexOf(" ");
  if (i === -1) return { vehicle: "", type: label };
  return { vehicle: label.slice(0, i), type: label.slice(i + 1) };
}

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
        <CardContent className="py-8 px-8">
          {/* ── Letterhead ── */}
          <div className="grid grid-cols-12 gap-4 pb-3 border-b border-black">
            <div className="col-span-12 sm:col-span-4">
              <p className="font-bold text-base tracking-[0.04em]">
                {(company.name ?? "").toUpperCase()}
              </p>
              {company.phone && (
                <p className="text-xs mt-1.5">{company.phone}</p>
              )}
              {company.email && <p className="text-xs">{company.email}</p>}
              {company.address && (
                <p className="text-xs mt-3 whitespace-pre-line leading-snug">
                  {company.address}
                </p>
              )}
            </div>

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
                <p className="text-xs mt-3 text-muted-foreground">
                  Booked By- {invoice.client_booked_by}
                </p>
              )}
            </div>

            <div className="col-span-12 sm:col-span-3 text-right">
              {company.gstin && (
                <p className="text-xs font-bold mb-4">GSTIN {company.gstin}</p>
              )}
              <p className="font-bold">INVOICE- {fullNumber}</p>
              <p className="text-xs mt-1">Date: {fmtDate(invoice.invoice_date)}</p>
            </div>
          </div>

          {/* ── Column headers ── */}
          <div className="grid grid-cols-[56px_46px_50px_50px_1fr_72px_92px] gap-2 mt-6 pb-2 border-b border-black text-[10px] font-semibold uppercase tracking-wider text-foreground">
            <div>Date</div>
            <div>Vehicle</div>
            <div>Type</div>
            <div>HSN Code</div>
            <div>Particulars</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Amount</div>
          </div>

          {/* ── Trip groups ── */}
          <div>
            {groups.map((group, gi) => {
              const { vehicle, type } = splitVehicleLabel(
                group.lines[0]?.vehicle_label,
              );
              const firstDate = group.lines[0]?.date ?? "";
              const hsn = group.lines[0]?.hsn_code ?? "";
              return (
                <div
                  key={group.trip_id ?? `g${gi}`}
                  className={`py-2.5 ${gi > 0 ? "border-t border-border/60" : ""}`}
                >
                  {group.lines.map((l, li) => {
                    const isFirst = li === 0;
                    return (
                      <div
                        key={l.id}
                        className="grid grid-cols-[56px_46px_50px_50px_1fr_72px_92px] gap-2 text-sm py-0.5 leading-snug"
                      >
                        <div className="font-mono text-xs">
                          {isFirst ? firstDate : ""}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {isFirst ? vehicle : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isFirst ? type : ""}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {isFirst ? hsn : ""}
                        </div>
                        <div className="whitespace-pre-line">
                          {l.particulars ?? ""}
                          {l.qty != null ? `\n${formatQty(l.qty)}` : ""}
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

          {/* ── Totals ── */}
          <div className="mt-6 pt-3 border-t border-black flex justify-end">
            <div className="w-full sm:w-72 flex flex-col gap-1.5 text-sm">
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
              <div className="mt-2 pt-2 border-t border-black flex justify-between font-bold text-base">
                <span>Net Amount</span>
                <span className="tabular-nums">{formatINR(invoice.net_amount)}</span>
              </div>
            </div>
          </div>

          {/* ── In words ── */}
          <p className="mt-4 text-sm">
            <span className="font-bold">In Words: </span>
            {invoice.amount_in_words}
          </p>

          {/* ── Footer ── */}
          <div className="mt-6 text-xs text-muted-foreground leading-relaxed">
            <p className="font-bold text-foreground">E&amp;OE</p>
            {terms.length > 0 && (
              <p className="mt-1">
                <span className="font-bold text-foreground">TERMS &amp; CONDITIONS :</span>{" "}
                {terms[0]}
              </p>
            )}
            {terms.slice(1).map((t, i) => (
              <p key={i} className="mt-1">{t}</p>
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
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          muted ? "italic text-muted-foreground" : "tabular-nums text-foreground"
        }
      >
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
