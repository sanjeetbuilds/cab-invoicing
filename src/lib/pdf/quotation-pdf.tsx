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
  Quotation,
  QuotationLine,
} from "@/lib/supabase/types";
import { formatINRBlank } from "@/lib/format";

// Same fonts as the invoice PDF.
const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "Inter",
  src: path.join(fontDir, "Inter-Regular.woff"),
});
Font.register({
  family: "Inter-Bold",
  src: path.join(fontDir, "Inter-Bold.woff"),
});

export interface QuotationPdfProps {
  company: Pick<
    Company,
    "name" | "address" | "gstin" | "phone" | "email" | "terms_quotation"
  >;
  quotation: Quotation;
  lines: QuotationLine[];
  clientName: string | null;
}

const PT = (mm: number) => (mm / 25.4) * 72;

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
  quoteNumber: {
    fontSize: 10.5,
    fontFamily: "Inter-Bold",
    color: COLORS.black,
    marginBottom: 3,
    textAlign: "right",
  },
  metaDate: { fontSize: 9, textAlign: "right" },
  metaValid: { fontSize: 8.5, textAlign: "right", color: COLORS.muted, marginTop: 2 },

  thRow: {
    flexDirection: "row",
    backgroundColor: COLORS.thBg,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.lineHeavy,
    marginTop: 4,
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
  td: {
    fontSize: 9,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.line,
    borderLeftWidth: 0.5,
    borderLeftColor: COLORS.line,
  },
  num: { textAlign: "right" },

  colCar: { width: 70 },
  colMode: { width: 70 },
  colBase: { width: 60 },
  colBaseKH: { width: 70 },
  colExtra: { width: 80 },
  colNight: { width: 50 },
  colPerKm: { width: 55 },
  colTa: { width: 60 },

  notes: { marginTop: 14, fontSize: 9 },
  notesLabel: { fontFamily: "Inter-Bold", marginBottom: 3 },
  foot: {
    marginTop: 18,
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

export function QuotationPdf({
  company,
  quotation,
  lines,
  clientName,
}: QuotationPdfProps) {
  const terms = (company.terms_quotation ?? []).filter(Boolean);

  return (
    <Document title={`Quotation ${quotation.number}`}>
      <Page size="A4" style={styles.page} wrap>
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
              To- {(clientName ?? "").toUpperCase()}
            </Text>
            {quotation.client_address && (
              <Text style={styles.billLine}>{quotation.client_address}</Text>
            )}
            <Text style={styles.billLine}>
              {quotation.client_gstin
                ? `GSTIN ${quotation.client_gstin}`
                : "GSTIN NA"}
            </Text>
            {quotation.client_contact && (
              <Text style={[styles.billLine, { marginTop: 4 }]}>
                Contact: {quotation.client_contact}
              </Text>
            )}
          </View>

          <View style={styles.hCol3}>
            {company.gstin && (
              <Text style={styles.gstinHeader}>GSTIN {company.gstin}</Text>
            )}
            <Text style={styles.quoteNumber}>QUOTATION- {quotation.number}</Text>
            <Text style={styles.metaDate}>Date: {fmtDate(quotation.date)}</Text>
            {quotation.valid_until && (
              <Text style={styles.metaValid}>
                Valid until: {fmtDate(quotation.valid_until)}
              </Text>
            )}
          </View>
        </View>

        {/* Rate lines */}
        <View fixed style={styles.thRow}>
          <Text style={[styles.th, styles.colCar]}>Car</Text>
          <Text style={[styles.th, styles.colMode]}>Mode</Text>
          <Text style={[styles.th, styles.colBase, styles.num]}>Base ₹</Text>
          <Text style={[styles.th, styles.colBaseKH, styles.num]}>Base km/hr</Text>
          <Text style={[styles.th, styles.colExtra, styles.num]}>Extra km/hr ₹</Text>
          <Text style={[styles.th, styles.colNight, styles.num]}>Night ₹</Text>
          <Text style={[styles.th, styles.colPerKm, styles.num]}>Per km ₹</Text>
          <Text style={[styles.th, styles.colTa, styles.num, styles.thLast]}>
            Driver TA ₹
          </Text>
        </View>

        {lines.map((l) => (
          <View key={l.id} style={styles.tr}>
            <Text style={[styles.td, styles.colCar]}>{l.car_type}</Text>
            <Text style={[styles.td, styles.colMode]}>
              {l.mode === "local" ? "Local" : "Outstation"}
            </Text>
            <Text style={[styles.td, styles.colBase, styles.num]}>
              {formatINRBlank(l.base_rate)}
            </Text>
            <Text style={[styles.td, styles.colBaseKH, styles.num]}>
              {l.base_kms != null && l.base_hours != null
                ? `${l.base_kms} / ${l.base_hours}`
                : ""}
            </Text>
            <Text style={[styles.td, styles.colExtra, styles.num]}>
              {l.extra_km != null || l.extra_hour != null
                ? `${formatINRBlank(l.extra_km)} / ${formatINRBlank(l.extra_hour)}`
                : ""}
            </Text>
            <Text style={[styles.td, styles.colNight, styles.num]}>
              {formatINRBlank(l.night)}
            </Text>
            <Text style={[styles.td, styles.colPerKm, styles.num]}>
              {formatINRBlank(l.per_km)}
            </Text>
            <Text style={[styles.td, styles.colTa, styles.num]}>
              {formatINRBlank(l.driver_ta)}
            </Text>
          </View>
        ))}

        {quotation.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text>{quotation.notes}</Text>
          </View>
        )}

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
