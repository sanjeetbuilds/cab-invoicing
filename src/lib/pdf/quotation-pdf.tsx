/**
 * Quotation PDF — same visual style as the invoice PDF (monospace Noto
 * Sans Mono, FROM/BILL TO header, minimal rules, selective bold) but
 * with a rate-card table instead of duty lines.
 */
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

const FONT_FAMILY = "NotoSansMono";

const fontFile = path.join(process.cwd(), "public", "fonts", "NotoSansMono.ttf");
Font.register({
  family: FONT_FAMILY,
  fonts: [
    { src: fontFile, fontWeight: 400 },
    { src: fontFile, fontWeight: 700 },
  ],
});

export interface QuotationPdfProps {
  company: Pick<
    Company,
    | "name"
    | "address"
    | "gstin"
    | "phone"
    | "phone2"
    | "email"
    | "invoice_email"
    | "terms_quotation"
  >;
  quotation: Quotation;
  lines: QuotationLine[];
  clientName: string | null;
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
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    paddingTop: PT(14),
    paddingBottom: PT(16) + 70,
    paddingHorizontal: PT(12),
    color: COLORS.text,
    lineHeight: 1.3,
  },

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
  quoteNumber: { fontSize: 11, fontWeight: 700, color: COLORS.text },
  quoteDate: { fontSize: 9, marginTop: 2 },
  quoteValid: { fontSize: 8.5, marginTop: 2, color: COLORS.muted },

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

  tr: { flexDirection: "row", paddingVertical: 1.5 },
  td: {
    fontSize: 9,
    paddingHorizontal: 3,
    color: COLORS.text,
    lineHeight: 1.25,
  },
  tdMuted: { color: COLORS.muted },
  tdNum: { textAlign: "right" },

  colCar: { width: 70 },
  colMode: { width: 70 },
  colBase: { width: 60 },
  colBaseKH: { width: 70 },
  colExtra: { width: 80 },
  colNight: { width: 50 },
  colPerKm: { width: 55 },
  colTa: { width: 60 },

  notes: { marginTop: 14, fontSize: 9 },
  notesLabel: { fontWeight: 700, marginBottom: 3 },

  foot: {
    position: "absolute",
    left: PT(12),
    right: PT(12),
    bottom: PT(8) + 14,
    fontSize: 8.5,
    color: COLORS.muted,
    lineHeight: 1.4,
    borderTopWidth: 0.25,
    borderTopColor: COLORS.ruleSoft,
    paddingTop: 5,
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

export function QuotationPdf({
  company,
  quotation,
  lines,
  clientName,
}: QuotationPdfProps) {
  const terms = (company.terms_quotation ?? []).filter(Boolean);
  const phones = [company.phone, company.phone2].filter(Boolean).join(", ");
  const invoiceEmail = company.invoice_email ?? company.email ?? "";
  const fromContact = [phones, invoiceEmail].filter(Boolean).join("  ·  ");

  return (
    <Document title={`Quotation ${quotation.number}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.topBand}>
          <Text style={styles.brand}>{(company.name ?? "").toUpperCase()}</Text>
          <View style={styles.topRight}>
            <Text style={styles.quoteNumber}>QUOTATION- {quotation.number}</Text>
            <Text style={styles.quoteDate}>Date: {fmtDate(quotation.date)}</Text>
            {quotation.valid_until && (
              <Text style={styles.quoteValid}>
                Valid until: {fmtDate(quotation.valid_until)}
              </Text>
            )}
          </View>
        </View>

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
            <Text style={styles.partyLabel}>QUOTE TO</Text>
            <Text style={styles.partyTextBold}>
              To- {(clientName ?? "").toUpperCase()}
            </Text>
            {quotation.client_address && (
              <Text style={styles.partyText}>{quotation.client_address}</Text>
            )}
            <Text style={styles.partyText}>
              {quotation.client_gstin
                ? `GSTIN - ${quotation.client_gstin}`
                : "GSTIN NA"}
            </Text>
            {quotation.client_contact && (
              <Text style={styles.partyText}>
                Contact: {quotation.client_contact}
              </Text>
            )}
          </View>
        </View>

        <View fixed style={styles.thRow}>
          <Text style={[styles.th, styles.colCar]}>Car</Text>
          <Text style={[styles.th, styles.colMode]}>Mode</Text>
          <Text style={[styles.th, styles.colBase, styles.thNum]}>Base ₹</Text>
          <Text style={[styles.th, styles.colBaseKH, styles.thNum]}>Base km/hr</Text>
          <Text style={[styles.th, styles.colExtra, styles.thNum]}>
            Extra km/hr ₹
          </Text>
          <Text style={[styles.th, styles.colNight, styles.thNum]}>Night ₹</Text>
          <Text style={[styles.th, styles.colPerKm, styles.thNum]}>Per km ₹</Text>
          <Text style={[styles.th, styles.colTa, styles.thNum]}>Driver TA ₹</Text>
        </View>

        {lines.map((l) => (
          <View key={l.id} style={styles.tr}>
            <Text style={[styles.td, styles.colCar]}>{l.car_type}</Text>
            <Text style={[styles.td, styles.colMode, styles.tdMuted]}>
              {l.mode === "local" ? "Local" : "Outstation"}
            </Text>
            <Text style={[styles.td, styles.colBase, styles.tdNum]}>
              {formatINRBlank(l.base_rate)}
            </Text>
            <Text style={[styles.td, styles.colBaseKH, styles.tdNum]}>
              {l.base_kms != null && l.base_hours != null
                ? `${l.base_kms} / ${l.base_hours}`
                : ""}
            </Text>
            <Text style={[styles.td, styles.colExtra, styles.tdNum]}>
              {l.extra_km != null || l.extra_hour != null
                ? `${formatINRBlank(l.extra_km)} / ${formatINRBlank(l.extra_hour)}`
                : ""}
            </Text>
            <Text style={[styles.td, styles.colNight, styles.tdNum]}>
              {formatINRBlank(l.night)}
            </Text>
            <Text style={[styles.td, styles.colPerKm, styles.tdNum]}>
              {formatINRBlank(l.per_km)}
            </Text>
            <Text style={[styles.td, styles.colTa, styles.tdNum]}>
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

        <View fixed style={styles.foot}>
          <Text>E&OE</Text>
          {terms.length > 0 && (
            <Text style={styles.termLine}>
              TERMS &amp; CONDITIONS : {terms[0]}
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
