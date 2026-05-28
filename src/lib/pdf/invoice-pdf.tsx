import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  Company,
  Invoice,
  InvoiceLine,
} from "@/lib/supabase/types";

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
  text: "#222222",
  muted: "#666666",
  line: "#c4c4c4",
  lineHeavy: "#999999",
  thBg: "#f4f2eb",
  footText: "#444444",
};

const PT = (mm: number) => (mm / 25.4) * 72;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    paddingTop: PT(14) + 56,
    paddingBottom: PT(16) + 18,
    paddingHorizontal: PT(12),
    color: COLORS.text,
    lineHeight: 1.45,
  },

  // Fixed top header on every page
  header: {
    position: "absolute",
    top: PT(14),
    left: PT(12),
    right: PT(12),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.black,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: "column" },
  companyName: {
    fontFamily: "Times-Roman",
    fontSize: 20,
    color: COLORS.black,
  },
  contact: { fontSize: 9, marginTop: 2 },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    maxWidth: 260,
  },
  address: { fontSize: 9, textAlign: "right" },
  gstinHeader: { fontSize: 9, marginTop: 3 },

  // Bill-to row
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  billTo: { maxWidth: "60%" },
  metaLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
  },
  metaRight: { alignItems: "flex-end" },
  clientName: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  metaText: { fontSize: 9.5 },
  metaSmall: { fontSize: 8.5, color: COLORS.muted, marginTop: 1 },
  invoiceNumber: { fontFamily: "Helvetica-Bold", fontSize: 11 },

  // Table
  table: { marginTop: 4 },
  thRow: {
    flexDirection: "row",
    backgroundColor: COLORS.thBg,
    borderTopWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: COLORS.lineHeavy,
  },
  th: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.lineHeavy,
    color: COLORS.black,
  },
  thLast: { borderRightWidth: 0 },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  td: {
    fontSize: 9,
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.line,
    borderLeftWidth: 0.5,
    borderLeftColor: COLORS.line,
  },
  tdLast: { borderRightWidth: 0.5 },
  num: { textAlign: "right" },

  // Column widths (rough proportions matching prototype's 58 / 115 / 48 / flex / 48 / 58 / 78)
  colDate: { width: 50 },
  colVehicle: { width: 90 },
  colHsn: { width: 38 },
  colPart: { flex: 1 },
  colQty: { width: 38 },
  colRate: { width: 48 },
  colAmount: { width: 64 },

  // Subtotal row
  totalRow: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.lineHeavy,
    backgroundColor: "#fafafa",
  },
  totalLabel: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  totalAmount: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    paddingVertical: 5,
    paddingHorizontal: 5,
    width: 64,
    textAlign: "right",
  },

  // Bottom block (totals + words + footer) kept together
  bottom: { marginTop: 12 },
  totalsBox: {
    width: 240,
    marginLeft: "auto",
    fontSize: 10,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalsGrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderTopColor: COLORS.black,
    paddingTop: 5,
    marginTop: 3,
  },
  totalsGrandText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  words: {
    fontSize: 9.5,
    fontStyle: "italic",
    marginTop: 10,
    paddingTop: 7,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
  },
  foot: {
    marginTop: 14,
    fontSize: 8.5,
    color: COLORS.footText,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
    paddingTop: 7,
    lineHeight: 1.55,
  },
  footBold: { fontFamily: "Helvetica-Bold", color: COLORS.black },

  // Page numbers (fixed bottom-right)
  pageNum: {
    position: "absolute",
    bottom: PT(8),
    right: PT(12),
    fontSize: 8,
    color: COLORS.muted,
  },
});

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

function fmtAmount(n: number | null | undefined): string {
  if (n == null || n === 0) return "";
  return Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtAmountAlways(n: number): string {
  return Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const terms = company.terms_invoice ?? [];

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
        {/* Fixed top header on every page */}
        <View fixed style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{company.name}</Text>
            {(company.phone || company.email) && (
              <Text style={styles.contact}>
                {[company.phone, company.email].filter(Boolean).join(" · ")}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {company.address && <Text style={styles.address}>{company.address}</Text>}
            {company.gstin && <Text style={styles.gstinHeader}>GSTIN {company.gstin}</Text>}
          </View>
        </View>

        {/* Bill-to / Invoice meta */}
        <View style={styles.metaRow}>
          <View style={styles.billTo}>
            <Text style={styles.metaLabel}>Bill to</Text>
            <Text style={styles.clientName}>{invoice.client_name}</Text>
            {invoice.client_address && (
              <Text style={styles.metaText}>{invoice.client_address}</Text>
            )}
            <Text style={styles.metaText}>
              {invoice.client_gstin ? `GSTIN ${invoice.client_gstin}` : "GSTIN NA"}
            </Text>
            {invoice.client_booked_by && (
              <Text style={styles.metaSmall}>Booked by: {invoice.client_booked_by}</Text>
            )}
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLabel}>Invoice</Text>
            <Text style={styles.invoiceNumber}>#{fullNumber}</Text>
            <Text style={styles.metaText}>{fmtDate(invoice.invoice_date)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header — fixed so it repeats on every page */}
          <View fixed style={styles.thRow}>
            <Text style={[styles.th, styles.colDate]}>Date</Text>
            <Text style={[styles.th, styles.colVehicle]}>Vehicle / Type</Text>
            <Text style={[styles.th, styles.colHsn]}>HSN</Text>
            <Text style={[styles.th, styles.colPart]}>Particulars</Text>
            <Text style={[styles.th, styles.colQty, styles.num]}>Qty</Text>
            <Text style={[styles.th, styles.colRate, styles.num]}>Rate</Text>
            <Text style={[styles.th, styles.colAmount, styles.num, styles.thLast]}>
              Amount
            </Text>
          </View>

          {/* Trip groups — each kept together */}
          {groups.map((group, gi) => (
            <View key={group.trip_id ?? `g${gi}`} wrap={false}>
              {group.lines.map((l) => (
                <View key={l.id} style={styles.tr}>
                  <Text style={[styles.td, styles.colDate]}>{l.date ?? ""}</Text>
                  <Text style={[styles.td, styles.colVehicle]}>{l.vehicle_label ?? ""}</Text>
                  <Text style={[styles.td, styles.colHsn]}>{l.hsn_code ?? ""}</Text>
                  <Text style={[styles.td, styles.colPart]}>{l.particulars ?? ""}</Text>
                  <Text style={[styles.td, styles.colQty, styles.num]}>
                    {l.qty != null ? String(l.qty) : ""}
                  </Text>
                  <Text style={[styles.td, styles.colRate, styles.num]}>
                    {fmtAmount(l.rate)}
                  </Text>
                  <Text style={[styles.td, styles.colAmount, styles.num, styles.tdLast]}>
                    {fmtAmount(l.amount)}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {/* Subtotal row */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{fmtAmountAlways(invoice.subtotal)}</Text>
          </View>
        </View>

        {/* Bottom block — totals, words, terms — held together */}
        <View wrap={false} style={styles.bottom}>
          <View style={styles.totalsBox}>
            {cgstLabel && (
              <View style={styles.totalsRow}>
                <Text>{cgstLabel}</Text>
                <Text>{fmtAmount(invoice.cgst)}</Text>
              </View>
            )}
            {sgstLabel && (
              <View style={styles.totalsRow}>
                <Text>{sgstLabel}</Text>
                <Text>{fmtAmount(invoice.sgst)}</Text>
              </View>
            )}
            {igstLabel && (
              <View style={styles.totalsRow}>
                <Text>{igstLabel}</Text>
                <Text>{fmtAmountAlways(invoice.igst)}</Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text>Toll & Parking</Text>
              <Text>{fmtAmountAlways(invoice.toll_total)}</Text>
            </View>
            <View style={styles.totalsGrandRow}>
              <Text style={styles.totalsGrandText}>Net Amount</Text>
              <Text style={styles.totalsGrandText}>{fmtAmountAlways(invoice.net_amount)}</Text>
            </View>
          </View>

          <Text style={styles.words}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontStyle: "normal" }}>
              In words:{" "}
            </Text>
            {invoice.amount_in_words}
          </Text>

          <View style={styles.foot}>
            <Text style={styles.footBold}>E&OE</Text>
            <Text style={styles.footBold}>TERMS & CONDITIONS:</Text>
            {terms.map((t, i) => (
              <Text key={i}>• {t}</Text>
            ))}
          </View>
        </View>

        {/* Page number footer */}
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
