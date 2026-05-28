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

// The default PDF Type-1 fonts (Helvetica/Times) do NOT include the rupee
// symbol (U+20B9). Register Inter from local files (bundled in /public/fonts/)
// so ₹ renders and there's no network request at PDF time.
const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "Inter",
  src: path.join(fontDir, "Inter-Regular.woff"),
});
Font.register({
  family: "Inter-Bold",
  src: path.join(fontDir, "Inter-Bold.woff"),
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
  black: "#000000",
  text: "#1a1a1a",
  muted: "#555555",
  faint: "#7a7a7a",
  line: "#d8d8d8",
  lineHeavy: "#888888",
  thBg: "#f4f2eb",
  footText: "#333333",
};

const PT = (mm: number) => (mm / 25.4) * 72;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9.5,
    paddingTop: PT(14) + 88,
    paddingBottom: PT(16) + 18,
    paddingHorizontal: PT(12),
    color: COLORS.text,
    lineHeight: 1.4,
  },

  // ── Fixed top header band (3 columns) ──
  header: {
    position: "absolute",
    top: PT(14),
    left: PT(12),
    right: PT(12),
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.black,
    paddingBottom: 8,
  },
  hCol1: { width: "33%", paddingRight: 6 },
  hCol2: { width: "42%", paddingHorizontal: 6 },
  hCol3: { width: "25%", paddingLeft: 6, alignItems: "flex-end" },

  companyName: {
    fontFamily: "Inter-Bold",
    fontSize: 14,
    color: COLORS.black,
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  companyMeta: { fontSize: 8.5, marginBottom: 1 },
  companyAddress: { fontSize: 8.5, marginTop: 4 },

  billLine: { fontSize: 9, marginBottom: 1 },
  billLineBold: {
    fontFamily: "Inter-Bold",
    fontSize: 9.5,
    marginBottom: 1,
  },

  gstinHeader: {
    fontSize: 9,
    fontFamily: "Inter-Bold",
    color: COLORS.black,
    marginBottom: 12,
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 10.5,
    fontFamily: "Inter-Bold",
    color: COLORS.black,
    marginBottom: 3,
    textAlign: "right",
  },
  invoiceDate: { fontSize: 9, textAlign: "right" },

  // ── Table ──
  table: { marginTop: 4 },
  thRow: {
    flexDirection: "row",
    backgroundColor: COLORS.thBg,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.lineHeavy,
  },
  th: {
    fontSize: 8,
    fontFamily: "Inter-Bold",
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.line,
    color: COLORS.black,
  },
  thLast: { borderRightWidth: 0 },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  trGroupTop: { borderTopWidth: 0.5, borderTopColor: COLORS.line },
  td: {
    fontSize: 9,
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.line,
  },
  tdFirst: { borderLeftWidth: 0.5, borderLeftColor: COLORS.line },
  tdLast: { borderRightWidth: 0.5, borderRightColor: COLORS.line },
  num: { textAlign: "right" },

  colDate: { width: 56 },
  colVehicle: { width: 84 },
  colHsn: { width: 42 },
  colPart: { flex: 1 },
  colQty: { width: 42 },
  colRate: { width: 52 },
  colAmount: { width: 66 },

  totalRow: {
    flexDirection: "row",
    borderTopWidth: 0.75,
    borderBottomWidth: 0.5,
    borderColor: COLORS.lineHeavy,
  },
  totalLabel: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Inter-Bold",
    fontSize: 9.5,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  totalAmount: {
    fontFamily: "Inter-Bold",
    fontSize: 10,
    paddingVertical: 5,
    paddingHorizontal: 5,
    width: 66,
    textAlign: "right",
  },

  // ── Bottom: totals + words + terms ──
  bottom: { marginTop: 10 },
  totalsBox: { width: 260, marginLeft: "auto", fontSize: 10 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalsLabel: { color: COLORS.text },
  totalsValue: { color: COLORS.text },
  totalsUnderRcm: {
    color: COLORS.muted,
  },
  totalsGrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.25,
    borderTopColor: COLORS.black,
    paddingTop: 5,
    marginTop: 3,
  },
  totalsGrandText: {
    fontFamily: "Inter-Bold",
    fontSize: 12,
  },
  words: {
    fontSize: 9.5,
    marginTop: 12,
    paddingTop: 7,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
  },
  wordsLabel: {
    fontFamily: "Inter-Bold",
  },

  foot: {
    marginTop: 14,
    fontSize: 8.5,
    color: COLORS.footText,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
    paddingTop: 7,
    lineHeight: 1.5,
  },
  footBold: { fontFamily: "Inter-Bold", color: COLORS.black },
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

  const cgstLabel =
    invoice.gst_mode === "CGST_SGST"
      ? "CGST @ 2.5%"
      : invoice.gst_mode === "RCM"
        ? "CGST @ 2.5%"
        : null;
  const sgstLabel =
    invoice.gst_mode === "CGST_SGST"
      ? "SGST @ 2.5%"
      : invoice.gst_mode === "RCM"
        ? "SGST @ 2.5%"
        : null;
  const igstLabel = invoice.gst_mode === "IGST" ? "IGST @ 5%" : null;

  return (
    <Document title={`Invoice ${fullNumber}`}>
      <Page size="A4" style={styles.page} wrap>
        {/* Fixed 3-column header on every page */}
        <View fixed style={styles.header}>
          {/* Col 1 — Company */}
          <View style={styles.hCol1}>
            <Text style={styles.companyName}>
              {(company.name ?? "").toUpperCase()}
            </Text>
            {company.phone && <Text style={styles.companyMeta}>{company.phone}</Text>}
            {company.email && <Text style={styles.companyMeta}>{company.email}</Text>}
            {company.address && (
              <Text style={styles.companyAddress}>{company.address}</Text>
            )}
          </View>

          {/* Col 2 — Bill to */}
          <View style={styles.hCol2}>
            <Text style={styles.billLineBold}>
              To- {(invoice.client_name ?? "").toUpperCase()}
            </Text>
            {invoice.client_address && (
              <Text style={styles.billLine}>{invoice.client_address}</Text>
            )}
            <Text style={styles.billLine}>
              {invoice.client_gstin ? `GSTIN ${invoice.client_gstin}` : "GSTIN NA"}
            </Text>
            {invoice.client_booked_by && (
              <Text style={[styles.billLine, { marginTop: 4 }]}>
                Booked By- {invoice.client_booked_by}
              </Text>
            )}
          </View>

          {/* Col 3 — GSTIN + invoice meta */}
          <View style={styles.hCol3}>
            {company.gstin && (
              <Text style={styles.gstinHeader}>GSTIN {company.gstin}</Text>
            )}
            <Text style={styles.invoiceNumber}>INVOICE- {fullNumber}</Text>
            <Text style={styles.invoiceDate}>Date: {fmtDate(invoice.invoice_date)}</Text>
          </View>
        </View>

        {/* Lines table */}
        <View style={styles.table}>
          <View fixed style={styles.thRow}>
            <Text style={[styles.th, styles.colDate]}>Date</Text>
            <Text style={[styles.th, styles.colVehicle]}>Vehicle Type</Text>
            <Text style={[styles.th, styles.colHsn]}>HSN Code</Text>
            <Text style={[styles.th, styles.colPart]}>Particulars</Text>
            <Text style={[styles.th, styles.colQty, styles.num]}>Qty</Text>
            <Text style={[styles.th, styles.colRate, styles.num]}>Rate</Text>
            <Text style={[styles.th, styles.colAmount, styles.num, styles.thLast]}>
              Amount
            </Text>
          </View>

          {groups.map((group, gi) => (
            <View key={group.trip_id ?? `g${gi}`} wrap={false}>
              {group.lines.map((l, li) => {
                const isFirst = li === 0;
                return (
                  <View
                    key={l.id}
                    style={[styles.tr, isFirst ? styles.trGroupTop : {}]}
                  >
                    <Text style={[styles.td, styles.tdFirst, styles.colDate]}>
                      {isFirst ? (l.date ?? "") : ""}
                    </Text>
                    <Text style={[styles.td, styles.colVehicle]}>
                      {isFirst ? (l.vehicle_label ?? "") : ""}
                    </Text>
                    <Text style={[styles.td, styles.colHsn]}>
                      {isFirst ? (l.hsn_code ?? "") : ""}
                    </Text>
                    <Text style={[styles.td, styles.colPart]}>{l.particulars ?? ""}</Text>
                    <Text style={[styles.td, styles.colQty, styles.num]}>
                      {formatQty(l.qty)}
                    </Text>
                    <Text style={[styles.td, styles.colRate, styles.num]}>
                      {formatINRBlank(l.rate)}
                    </Text>
                    <Text
                      style={[styles.td, styles.colAmount, styles.num, styles.tdLast]}
                    >
                      {formatINRBlank(l.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatINR(invoice.subtotal)}</Text>
          </View>
        </View>

        {/* Bottom — totals, words, terms, footer */}
        <View wrap={false} style={styles.bottom}>
          <View style={styles.totalsBox}>
            {cgstLabel && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{cgstLabel}</Text>
                <Text
                  style={
                    invoice.gst_mode === "RCM" ? styles.totalsUnderRcm : styles.totalsValue
                  }
                >
                  {invoice.gst_mode === "RCM" ? "Under RCM" : formatINRBlank(invoice.cgst)}
                </Text>
              </View>
            )}
            {sgstLabel && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{sgstLabel}</Text>
                <Text
                  style={
                    invoice.gst_mode === "RCM" ? styles.totalsUnderRcm : styles.totalsValue
                  }
                >
                  {invoice.gst_mode === "RCM" ? "Under RCM" : formatINRBlank(invoice.sgst)}
                </Text>
              </View>
            )}
            {igstLabel && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{igstLabel}</Text>
                <Text style={styles.totalsValue}>{formatINR(invoice.igst)}</Text>
              </View>
            )}
            {invoice.toll_total !== 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  {invoice.toll_label ?? "Toll & Parking"}
                </Text>
                <Text style={styles.totalsValue}>
                  {formatINR(invoice.toll_total)}
                </Text>
              </View>
            )}
            <View style={styles.totalsGrandRow}>
              <Text style={styles.totalsGrandText}>Net Amount</Text>
              <Text style={styles.totalsGrandText}>
                {formatINR(invoice.net_amount)}
              </Text>
            </View>
          </View>

          <Text style={styles.words}>
            <Text style={styles.wordsLabel}>In Words: </Text>
            {invoice.amount_in_words}
          </Text>

          <View style={styles.foot}>
            <Text style={styles.footBold}>E&OE</Text>
            {terms.length > 0 && (
              <Text style={styles.termLine}>
                <Text style={styles.footBold}>TERMS & CONDITIONS : </Text>
                {terms[0]}
              </Text>
            )}
            {terms.slice(1).map((t, i) => (
              <Text key={i} style={styles.termLine}>
                {t}
              </Text>
            ))}
          </View>
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
