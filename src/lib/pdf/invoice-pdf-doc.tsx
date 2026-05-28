/**
 * Pure @react-pdf JSX for the invoice. Does NOT register fonts —
 * the caller (server route or client PDFViewer wrapper) registers
 * "NotoSansMono" with the appropriate font src first.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Company, Invoice, InvoiceLine } from "@/lib/supabase/types";
import { formatINR, formatINRBlank, formatQty } from "@/lib/format";

export const INVOICE_FONT_FAMILY = "NotoSansMono";

interface LineGroup {
  trip_id: string | null;
  lines: InvoiceLine[];
}

export interface InvoicePdfProps {
  company: Pick<
    Company,
    | "name"
    | "address"
    | "gstin"
    | "phone"
    | "phone2"
    | "email"
    | "invoice_email"
    | "invoice_prefix"
    | "terms_invoice"
  >;
  invoice: Invoice;
  lines: InvoiceLine[];
}

const COLORS = {
  text: "#1a1a1a",
  muted: "#6a6a6a",
  faint: "#9a9a9a",
  ruleStrong: "#000000",
  ruleSoft: "#d0d0d0",
};

const PT = (mm: number) => (mm / 25.4) * 72;

const styles = StyleSheet.create({
  page: {
    fontFamily: INVOICE_FONT_FAMILY,
    fontSize: 9,
    paddingTop: PT(14),
    paddingBottom: PT(16) + 16,
    paddingHorizontal: PT(12),
    color: COLORS.text,
    lineHeight: 1.3,
  },

  // ── Top band (brand + invoice meta) ──
  topBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.ruleStrong,
  },
  brand: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: COLORS.text,
  },
  topRight: { alignItems: "flex-end" },
  invoiceNumber: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.text,
  },
  invoiceDate: { fontSize: 9, marginTop: 2 },

  // ── Parties band (FROM | BILL TO) ──
  parties: {
    flexDirection: "row",
    marginTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.4,
    borderBottomColor: COLORS.ruleSoft,
  },
  partyCol: { width: "50%", paddingRight: 12 },
  partyColRight: { width: "50%", paddingLeft: 12 },
  partyLabel: {
    fontSize: 7.5,
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 3,
  },
  partyText: { fontSize: 9, marginTop: 1 },
  partyTextBold: { fontSize: 9.5, fontWeight: 700, marginTop: 1 },

  // ── Table ──
  thRow: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 5,
    paddingBottom: 4,
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.ruleStrong,
  },
  th: {
    fontSize: 8.5,
    fontWeight: 700,
    color: COLORS.text,
    paddingHorizontal: 3,
  },
  thNum: { textAlign: "right" },

  groupBlock: { paddingTop: 3, paddingBottom: 3 },
  groupBlockDivider: {
    borderTopWidth: 0.25,
    borderTopColor: COLORS.ruleSoft,
  },
  tr: { flexDirection: "row", paddingVertical: 0.5 },
  td: {
    fontSize: 9,
    paddingHorizontal: 3,
    color: COLORS.text,
    lineHeight: 1.25,
  },
  tdMuted: { color: COLORS.muted },
  tdNum: { textAlign: "right" },

  // Column widths — A4 usable ~528pt at 12mm margins.
  colDate: { width: 64 },
  colVehicle: { width: 82 },
  colHsn: { width: 50 },
  colPart: { flex: 1 },
  colUnits: { width: 46 },
  colRate: { width: 56 },
  colAmount: { width: 76 },

  // ── Totals ──
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.ruleStrong,
  },
  totalsBox: { width: 240 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.5,
    fontSize: 9.5,
  },
  totalsLabel: { color: COLORS.text },
  totalsValue: { color: COLORS.text },
  totalsValueMuted: { color: COLORS.muted },
  // "Total" label gets emphasis (matches user's spec).
  totalsLabelBold: { color: COLORS.text, fontWeight: 700 },
  totalsGrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.ruleStrong,
  },
  totalsGrandText: { fontWeight: 700, fontSize: 11 },

  words: { fontSize: 9.5, marginTop: 12 },

  foot: {
    marginTop: 14,
    fontSize: 8.5,
    color: COLORS.muted,
    lineHeight: 1.4,
  },
  termLine: { marginTop: 1 },

  pageNum: {
    position: "absolute",
    bottom: PT(8),
    right: PT(12),
    fontSize: 8,
    color: COLORS.faint,
  },
});

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
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

export function InvoicePdf({ company, invoice, lines }: InvoicePdfProps) {
  const fullNumber = `${company.invoice_prefix ?? ""}${invoice.invoice_number}`;
  const groups = groupLines([...lines].sort((a, b) => a.sort_order - b.sort_order));
  const terms = (company.terms_invoice ?? []).filter(Boolean);

  const phones = [company.phone, company.phone2].filter(Boolean).join(", ");
  const invoiceEmail = company.invoice_email ?? company.email ?? "";
  const fromContact = [phones, invoiceEmail].filter(Boolean).join("  ·  ");

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

  return (
    <Document title={`Invoice ${fullNumber}`}>
      <Page size="A4" style={styles.page} wrap>
        {/* Top band */}
        <View style={styles.topBand}>
          <Text style={styles.brand}>{(company.name ?? "").toUpperCase()}</Text>
          <View style={styles.topRight}>
            <Text style={styles.invoiceNumber}>INVOICE- {fullNumber}</Text>
            <Text style={styles.invoiceDate}>Date: {fmtDate(invoice.invoice_date)}</Text>
          </View>
        </View>

        {/* Parties band */}
        <View style={styles.parties}>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>FROM</Text>
            {fromContact && <Text style={styles.partyText}>{fromContact}</Text>}
            {company.address && (
              <Text style={styles.partyText}>{company.address}</Text>
            )}
            {company.gstin && (
              <Text style={styles.partyText}>GSTIN {company.gstin}</Text>
            )}
          </View>
          <View style={styles.partyColRight}>
            <Text style={styles.partyLabel}>BILL TO</Text>
            <Text style={styles.partyTextBold}>
              To- {(invoice.client_name ?? "").toUpperCase()}
            </Text>
            <Text style={styles.partyText}>
              {invoice.client_gstin
                ? `GSTIN - ${invoice.client_gstin}`
                : "GSTIN NA"}
            </Text>
            {invoice.client_booked_by && (
              <Text style={styles.partyText}>
                Booked By- {invoice.client_booked_by}
              </Text>
            )}
          </View>
        </View>

        {/* Column headers (repeat on each page) */}
        <View fixed style={styles.thRow}>
          <Text style={[styles.th, styles.colDate]}>Date</Text>
          <Text style={[styles.th, styles.colVehicle]}>Vehicle / Type</Text>
          <Text style={[styles.th, styles.colHsn]}>HSN Code</Text>
          <Text style={[styles.th, styles.colPart]}>Particulars</Text>
          <Text style={[styles.th, styles.colUnits, styles.thNum]}>Units</Text>
          <Text style={[styles.th, styles.colRate, styles.thNum]}>Rate</Text>
          <Text style={[styles.th, styles.colAmount, styles.thNum]}>Amount</Text>
        </View>

        {/* Rows */}
        {groups.map((group, gi) => {
          const vehicle = group.lines[0]?.vehicle_label ?? "";
          const firstDate = group.lines[0]?.date ?? "";
          const hsn = group.lines[0]?.hsn_code ?? "";
          return (
            <View
              key={group.trip_id ?? `g${gi}`}
              wrap={false}
              style={[styles.groupBlock, gi > 0 ? styles.groupBlockDivider : {}]}
            >
              {group.lines.map((l, li) => {
                const isFirst = li === 0;
                return (
                  <View key={l.id} style={styles.tr}>
                    <Text style={[styles.td, styles.colDate]}>
                      {isFirst ? firstDate : ""}
                    </Text>
                    <Text style={[styles.td, styles.colVehicle, styles.tdMuted]}>
                      {isFirst ? vehicle : ""}
                    </Text>
                    <Text style={[styles.td, styles.colHsn, styles.tdMuted]}>
                      {isFirst ? hsn : ""}
                    </Text>
                    <Text style={[styles.td, styles.colPart]}>
                      {l.particulars ?? ""}
                    </Text>
                    <Text style={[styles.td, styles.colUnits, styles.tdNum]}>
                      {formatQty(l.qty)}
                    </Text>
                    <Text style={[styles.td, styles.colRate, styles.tdNum]}>
                      {formatINRBlank(l.rate)}
                    </Text>
                    <Text style={[styles.td, styles.colAmount, styles.tdNum]}>
                      {formatINRBlank(l.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Totals */}
        <View wrap={false} style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabelBold}>Total</Text>
              <Text style={styles.totalsValue}>{formatINR(invoice.subtotal)}</Text>
            </View>
            {cgstLabel && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{cgstLabel}</Text>
                <Text
                  style={invoice.gst_mode === "RCM" ? styles.totalsValueMuted : {}}
                >
                  {invoice.gst_mode === "RCM" ? "—" : formatINRBlank(invoice.cgst)}
                </Text>
              </View>
            )}
            {sgstLabel && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{sgstLabel}</Text>
                <Text
                  style={invoice.gst_mode === "RCM" ? styles.totalsValueMuted : {}}
                >
                  {invoice.gst_mode === "RCM" ? "—" : formatINRBlank(invoice.sgst)}
                </Text>
              </View>
            )}
            {igstLabel && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{igstLabel}</Text>
                <Text>{formatINR(invoice.igst)}</Text>
              </View>
            )}
            {invoice.toll_total !== 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  {invoice.toll_label ?? "Toll & Parking"}
                </Text>
                <Text>{formatINR(invoice.toll_total)}</Text>
              </View>
            )}
            <View style={styles.totalsGrandRow}>
              <Text style={styles.totalsGrandText}>Net Amount</Text>
              <Text style={styles.totalsGrandText}>
                {formatINR(invoice.net_amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* In words */}
        <Text style={styles.words}>In Words: {invoice.amount_in_words}</Text>

        {/* Footer */}
        <View wrap={false} style={styles.foot}>
          <Text>E&OE</Text>
          {terms.length > 0 && (
            <Text style={styles.termLine}>TERMS &amp; CONDITIONS : {terms[0]}</Text>
          )}
          {terms.slice(1).map((t, i) => (
            <Text key={i} style={styles.termLine}>
              {t}
            </Text>
          ))}
        </View>

        <Text
          fixed
          style={styles.pageNum}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
