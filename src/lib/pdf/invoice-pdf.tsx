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

// Inter has ₹ (Helvetica Type-1 does not). Local files avoid CDN cold-start.
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
  line: "#bfbfbf",
};

const PT = (mm: number) => (mm / 25.4) * 72;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    paddingTop: PT(14) + 92,
    paddingBottom: PT(16) + 18,
    paddingHorizontal: PT(14),
    color: COLORS.text,
    lineHeight: 1.4,
  },

  // ── Header band ──
  header: {
    position: "absolute",
    top: PT(14),
    left: PT(14),
    right: PT(14),
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.black,
    paddingBottom: 10,
  },
  hCol1: { width: "33%", paddingRight: 6 },
  hCol2: { width: "42%", paddingHorizontal: 6 },
  hCol3: { width: "25%", paddingLeft: 6, alignItems: "flex-end" },

  companyName: {
    fontFamily: "Inter-Bold",
    fontSize: 15,
    color: COLORS.black,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  companyMeta: { fontSize: 9, marginBottom: 1 },
  companyAddress: { fontSize: 9, marginTop: 5, lineHeight: 1.35 },

  billLine: { fontSize: 9.5, marginBottom: 1 },
  billLineBold: {
    fontFamily: "Inter-Bold",
    fontSize: 10,
    marginBottom: 2,
  },
  billContact: { fontSize: 9, marginTop: 4, color: COLORS.muted },

  gstinHeader: {
    fontSize: 9,
    fontFamily: "Inter-Bold",
    color: COLORS.black,
    marginBottom: 14,
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 11,
    fontFamily: "Inter-Bold",
    color: COLORS.black,
    marginBottom: 3,
    textAlign: "right",
  },
  invoiceDate: { fontSize: 9.5, textAlign: "right" },

  // ── Table ──
  table: { marginTop: 6 },
  thRow: {
    flexDirection: "row",
    paddingTop: 6,
    paddingBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.black,
  },
  th: {
    fontSize: 8.5,
    fontFamily: "Inter-Bold",
    color: COLORS.black,
    paddingHorizontal: 4,
  },
  thNum: { textAlign: "right" },

  // Trip-group wrapper — gives a touch of separation between duties
  groupBlock: { paddingTop: 8, paddingBottom: 6 },
  groupBlockDivider: {
    borderTopWidth: 0.25,
    borderTopColor: COLORS.line,
  },

  tr: {
    flexDirection: "row",
    paddingVertical: 2,
  },
  td: {
    fontSize: 9.5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    color: COLORS.text,
  },
  tdMuted: { color: COLORS.muted },
  tdNum: { textAlign: "right" },

  // Column widths (sum ≈ A4 usable width 545pt at 14mm margins).
  colDate: { width: 56 },
  colVehicle: { width: 46 },
  colType: { width: 50 },
  colHsn: { width: 50 },
  colPart: { flex: 1 },
  colRate: { width: 62 },
  colAmount: { width: 78 },

  // ── Totals block ──
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.black,
  },
  totalsBox: { width: 250 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
    fontSize: 10,
  },
  totalsLabel: { color: COLORS.text },
  totalsValue: { color: COLORS.text },
  totalsValueMuted: { color: COLORS.muted },
  totalsGrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.black,
  },
  totalsGrandText: { fontFamily: "Inter-Bold", fontSize: 12 },

  words: {
    fontSize: 10,
    marginTop: 14,
  },
  wordsLabel: { fontFamily: "Inter-Bold" },

  foot: {
    marginTop: 18,
    fontSize: 8.5,
    color: COLORS.muted,
    lineHeight: 1.5,
  },
  footBold: { fontFamily: "Inter-Bold", color: COLORS.black },
  termLine: { marginTop: 2 },

  pageNum: {
    position: "absolute",
    bottom: PT(8),
    right: PT(14),
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

function splitVehicleLabel(label: string | null | undefined): {
  vehicle: string;
  type: string;
} {
  if (!label) return { vehicle: "", type: "" };
  const i = label.lastIndexOf(" ");
  if (i === -1) return { vehicle: "", type: label };
  return { vehicle: label.slice(0, i), type: label.slice(i + 1) };
}

export function InvoicePdf({ company, invoice, lines }: InvoicePdfProps) {
  const fullNumber = `${company.invoice_prefix ?? ""}${invoice.invoice_number}`;
  const groups = groupLines([...lines].sort((a, b) => a.sort_order - b.sort_order));
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

  return (
    <Document title={`Invoice ${fullNumber}`}>
      <Page size="A4" style={styles.page} wrap>
        {/* ── Fixed top header ── */}
        <View fixed style={styles.header}>
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
              <Text style={styles.billContact}>
                Booked By- {invoice.client_booked_by}
              </Text>
            )}
          </View>

          <View style={styles.hCol3}>
            {company.gstin && (
              <Text style={styles.gstinHeader}>GSTIN {company.gstin}</Text>
            )}
            <Text style={styles.invoiceNumber}>INVOICE- {fullNumber}</Text>
            <Text style={styles.invoiceDate}>Date: {fmtDate(invoice.invoice_date)}</Text>
          </View>
        </View>

        {/* ── Column headers (repeat on each page) ── */}
        <View fixed style={styles.thRow}>
          <Text style={[styles.th, styles.colDate]}>Date</Text>
          <Text style={[styles.th, styles.colVehicle]}>Vehicle</Text>
          <Text style={[styles.th, styles.colType]}>Type</Text>
          <Text style={[styles.th, styles.colHsn]}>HSN Code</Text>
          <Text style={[styles.th, styles.colPart]}>Particulars</Text>
          <Text style={[styles.th, styles.colRate, styles.thNum]}>Rate</Text>
          <Text style={[styles.th, styles.colAmount, styles.thNum]}>Amount</Text>
        </View>

        {/* ── Trip groups ── */}
        {groups.map((group, gi) => {
          const { vehicle, type } = splitVehicleLabel(
            group.lines[0]?.vehicle_label,
          );
          const firstDate = group.lines[0]?.date ?? "";
          const hsn = group.lines[0]?.hsn_code ?? "";
          return (
            <View
              key={group.trip_id ?? `g${gi}`}
              wrap={false}
              style={[
                styles.groupBlock,
                gi > 0 ? styles.groupBlockDivider : {},
              ]}
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
                    <Text style={[styles.td, styles.colType, styles.tdMuted]}>
                      {isFirst ? type : ""}
                    </Text>
                    <Text style={[styles.td, styles.colHsn, styles.tdMuted]}>
                      {isFirst ? hsn : ""}
                    </Text>
                    <Text style={[styles.td, styles.colPart]}>
                      {l.particulars ?? ""}
                      {l.qty != null ? `\n${formatQty(l.qty)}` : ""}
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
              <Text style={styles.totalsLabel}>Total</Text>
              <Text style={styles.totalsValue}>{formatINR(invoice.subtotal)}</Text>
            </View>
            {cgstLabel && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{cgstLabel}</Text>
                <Text
                  style={
                    invoice.gst_mode === "RCM"
                      ? styles.totalsValueMuted
                      : styles.totalsValue
                  }
                >
                  {invoice.gst_mode === "RCM"
                    ? "—"
                    : formatINRBlank(invoice.cgst)}
                </Text>
              </View>
            )}
            {sgstLabel && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{sgstLabel}</Text>
                <Text
                  style={
                    invoice.gst_mode === "RCM"
                      ? styles.totalsValueMuted
                      : styles.totalsValue
                  }
                >
                  {invoice.gst_mode === "RCM"
                    ? "—"
                    : formatINRBlank(invoice.sgst)}
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
        </View>

        {/* ── In words ── */}
        <Text style={styles.words}>
          <Text style={styles.wordsLabel}>In Words: </Text>
          {invoice.amount_in_words}
        </Text>

        {/* ── Footer ── */}
        <View wrap={false} style={styles.foot}>
          <Text style={styles.footBold}>E&OE</Text>
          {terms.length > 0 && (
            <Text style={styles.termLine}>
              <Text style={styles.footBold}>TERMS &amp; CONDITIONS : </Text>
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
