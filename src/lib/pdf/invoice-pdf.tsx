import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type {
  Company,
  Invoice,
  InvoiceLine,
} from "@/lib/supabase/types";
import { formatINR, formatINRBlank, formatQty } from "@/lib/format";

// Noto Sans natively includes the rupee symbol (U+20B9) and every other
// character we render. Using a single font family for the whole document
// avoids the "fallback heavier glyph mid-line" effect seen when Inter's
// woff subset was missing ₹ and react-pdf fell back to Helvetica.
const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "NotoSans",
  src: path.join(fontDir, "NotoSans-Regular.woff"),
});
Font.register({
  family: "NotoSans-Medium",
  src: path.join(fontDir, "NotoSans-Medium.woff"),
});

interface LineGroup {
  trip_id: string | null;
  lines: InvoiceLine[];
}

export interface InvoicePdfProps {
  company: Pick<
    Company,
    "name" | "address" | "gstin" | "phone" | "email" | "invoice_prefix" | "terms_invoice"
  >;
  invoice: Invoice;
  lines: InvoiceLine[];
}

const COLORS = {
  text: "#1a1a1a",
  muted: "#5a5a5a",
  faint: "#888888",
  ruleStrong: "#000000",
  ruleSoft: "#d0d0d0",
};

const PT = (mm: number) => (mm / 25.4) * 72;

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 9,
    paddingTop: PT(14),
    paddingBottom: PT(16) + 16,
    paddingHorizontal: PT(12),
    color: COLORS.text,
    lineHeight: 1.28,
  },

  // ── Header band ──
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 9,
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.ruleStrong,
  },
  hLeft: { flex: 1, paddingRight: 16 },
  hRight: { width: 160, alignItems: "flex-end" },
  companyName: {
    fontFamily: "NotoSans-Medium",
    fontSize: 13,
    letterSpacing: 0.5,
    color: COLORS.text,
  },
  companyMetaLine: {
    fontSize: 9,
    color: COLORS.text,
    marginTop: 3,
  },
  invoiceMetaNum: { fontSize: 10.5, color: COLORS.text, marginTop: 1 },
  invoiceMetaDate: { fontSize: 9, color: COLORS.text, marginTop: 3 },

  // ── Bill-to ──
  billTo: { marginTop: 10, marginBottom: 4 },
  billToName: { fontSize: 10, color: COLORS.text },
  billToLine: { fontSize: 9, color: COLORS.text, marginTop: 1.5 },

  // ── Column headers ──
  thRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 5,
    paddingBottom: 4,
    borderTopWidth: 0.4,
    borderTopColor: COLORS.ruleSoft,
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.ruleStrong,
  },
  th: {
    fontFamily: "NotoSans-Medium",
    fontSize: 8,
    letterSpacing: 0.2,
    color: COLORS.text,
    paddingHorizontal: 3,
  },
  thNum: { textAlign: "right" },

  // ── Rows ──
  groupBlock: { paddingTop: 3, paddingBottom: 3 },
  groupBlockDivider: {
    borderTopWidth: 0.25,
    borderTopColor: COLORS.ruleSoft,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 0.5,
  },
  td: {
    fontSize: 9,
    paddingHorizontal: 3,
    color: COLORS.text,
    lineHeight: 1.22,
  },
  tdMuted: { color: COLORS.muted },
  tdNum: { textAlign: "right" },

  // Column widths — A4 usable ~528pt at 12mm margins. Vehicle/Type merged.
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
    borderTopWidth: 0.6,
    borderTopColor: COLORS.ruleStrong,
  },
  totalsBox: { width: 240 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.5,
    fontSize: 9.5,
  },
  totalsValueMuted: { color: COLORS.muted },
  totalsGrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.ruleStrong,
  },
  totalsGrandText: { fontFamily: "NotoSans-Medium", fontSize: 11 },

  words: {
    fontSize: 9.5,
    marginTop: 12,
    color: COLORS.text,
  },

  foot: {
    marginTop: 14,
    fontSize: 8.5,
    color: COLORS.muted,
    lineHeight: 1.4,
  },
  footHead: { color: COLORS.text },
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

  // Inline "phone · email" if both exist; otherwise show whichever is set.
  const contactLine = [company.phone, company.email]
    .filter(Boolean)
    .join("  ·  ");

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
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={styles.hLeft}>
            <Text style={styles.companyName}>
              {(company.name ?? "").toUpperCase()}
            </Text>
            {contactLine && (
              <Text style={styles.companyMetaLine}>{contactLine}</Text>
            )}
            {company.address && (
              <Text style={styles.companyMetaLine}>{company.address}</Text>
            )}
            {company.gstin && (
              <Text style={styles.companyMetaLine}>GSTIN {company.gstin}</Text>
            )}
          </View>
          <View style={styles.hRight}>
            <Text style={styles.invoiceMetaNum}>INVOICE- {fullNumber}</Text>
            <Text style={styles.invoiceMetaDate}>
              Date: {fmtDate(invoice.invoice_date)}
            </Text>
          </View>
        </View>

        {/* ── Bill to ── */}
        <View style={styles.billTo}>
          <Text style={styles.billToName}>
            To- {(invoice.client_name ?? "").toUpperCase()}
          </Text>
          <Text style={styles.billToLine}>
            {invoice.client_gstin
              ? `GSTIN - ${invoice.client_gstin}`
              : "GSTIN NA"}
          </Text>
          {invoice.client_booked_by && (
            <Text style={styles.billToLine}>
              Booked By- {invoice.client_booked_by}
            </Text>
          )}
        </View>

        {/* ── Column headers (repeat on each page) ── */}
        <View fixed style={styles.thRow}>
          <Text style={[styles.th, styles.colDate]}>Date</Text>
          <Text style={[styles.th, styles.colVehicle]}>Vehicle / Type</Text>
          <Text style={[styles.th, styles.colHsn]}>HSN Code</Text>
          <Text style={[styles.th, styles.colPart]}>Particulars</Text>
          <Text style={[styles.th, styles.colUnits, styles.thNum]}>Units</Text>
          <Text style={[styles.th, styles.colRate, styles.thNum]}>Rate</Text>
          <Text style={[styles.th, styles.colAmount, styles.thNum]}>Amount</Text>
        </View>

        {/* ── Rows ── */}
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

        {/* ── Totals ── */}
        <View wrap={false} style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text>Total</Text>
              <Text>{formatINR(invoice.subtotal)}</Text>
            </View>
            {cgstLabel && (
              <View style={styles.totalsRow}>
                <Text>{cgstLabel}</Text>
                <Text
                  style={invoice.gst_mode === "RCM" ? styles.totalsValueMuted : {}}
                >
                  {invoice.gst_mode === "RCM"
                    ? "—"
                    : formatINRBlank(invoice.cgst)}
                </Text>
              </View>
            )}
            {sgstLabel && (
              <View style={styles.totalsRow}>
                <Text>{sgstLabel}</Text>
                <Text
                  style={invoice.gst_mode === "RCM" ? styles.totalsValueMuted : {}}
                >
                  {invoice.gst_mode === "RCM"
                    ? "—"
                    : formatINRBlank(invoice.sgst)}
                </Text>
              </View>
            )}
            {igstLabel && (
              <View style={styles.totalsRow}>
                <Text>{igstLabel}</Text>
                <Text>{formatINR(invoice.igst)}</Text>
              </View>
            )}
            {invoice.toll_total !== 0 && (
              <View style={styles.totalsRow}>
                <Text>{invoice.toll_label ?? "Toll & Parking"}</Text>
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

        {/* ── In words ── */}
        <Text style={styles.words}>In Words: {invoice.amount_in_words}</Text>

        {/* ── Footer ── */}
        <View wrap={false} style={styles.foot}>
          <Text style={styles.footHead}>E&OE</Text>
          {terms.length > 0 && (
            <Text style={styles.termLine}>
              <Text style={styles.footHead}>TERMS &amp; CONDITIONS : </Text>
              {terms[0]}
            </Text>
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
