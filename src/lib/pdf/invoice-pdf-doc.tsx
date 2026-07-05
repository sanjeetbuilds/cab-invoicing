/**
 * Pure @react-pdf JSX for the invoice. Does NOT register fonts -
 * the caller (server route or client PDFViewer wrapper) registers
 * "NotoSansMono" with the appropriate font src first.
 *
 * Multi-page pagination is manual: trip groups are packed into pages
 * with a per-page row budget so we can render proper accounting-style
 * "Page subtotal / Carried forward" and "Brought forward" indicators.
 * Totals + In Words appear only on the final page. Terms footer is
 * fixed at the bottom of every page.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Company, Invoice, InvoiceLine } from "@/lib/supabase/types";
import { formatINR, formatINRBlank, formatINRDash, formatQtyDash } from "@/lib/format";
import { PdfBrandHeading } from "./pdf-brand-heading";
import type { PdfBrand } from "./load-brand";

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
  /** Optional, defaults to text_only when omitted. */
  brand?: PdfBrand;
}

const COLORS = {
  text: "#1a1a1a",
  muted: "#6a6a6a",
  faint: "#9a9a9a",
  ruleStrong: "#000000",
  ruleSoft: "#d0d0d0",
};

const PT = (mm: number) => (mm / 25.4) * 72;

// Pagination uses a "cost" budget tuned to the real A4 layout, measured by
// rendering invoices of growing size and watching where react-pdf actually
// overflows (see invoice-pagination.test.tsx, which forces the budgets wide
// open and reads the physical page count back out of the rendered PDF).
// Cost is not a plain line count: each trip group also carries a little
// vertical padding (groupBlock paddingTop + paddingBottom + divider), so a
// group costs its lines plus a fixed GROUP_OVERHEAD.
//
// Measured capacity (page 1 = header band + column header + totals block):
// ~28 real rows, roughly cost 42-47 depending on how the rows split into
// groups. A continuation page drops the header band and holds far more
// (~44 rows). The last page also needs room for the totals block, handled
// by TOTALS_RESERVE. These budgets sit just under the measured overflow
// point so a normal month (METALMAN-sized, ~21 rows) stays on ONE page
// instead of spilling a near-empty second page.
const GROUP_OVERHEAD = 2; // padding around each trip group, in cost units
const FIRST_PAGE_BUDGET = 42; // page 1 line area (header + parties eat space)
const NEXT_PAGE_BUDGET = 54; // later pages (no parties band)
// Cost the Total / GST / Net Amount / In Words block needs on the last page.
// Kept generous so the totals stay with their lines; when the last page is
// too full we move trailing groups to a fresh page instead of orphaning the
// totals. TotalsBlock also has wrap={false} as a final natural-overflow
// safety net.
const TOTALS_RESERVE = 3;

/** Cost of one page's worth of groups: their lines plus per-group padding. */
function groupsCost(groups: LineGroup[]): number {
  return groups.reduce((s, g) => s + g.lines.length + GROUP_OVERHEAD, 0);
}

const styles = StyleSheet.create({
  page: {
    fontFamily: INVOICE_FONT_FAMILY,
    fontSize: 9,
    paddingTop: PT(14),
    // bottom padding has to reserve room for the fixed terms footer
    paddingBottom: PT(16) + 70,
    paddingHorizontal: PT(12),
    color: COLORS.text,
    lineHeight: 1.3,
  },

  // ── Top band ──
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
  taxInvoiceTitle: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    color: COLORS.text,
  },
  taxInvoiceSub: {
    fontSize: 8.5,
    color: COLORS.muted,
    marginTop: 1,
  },

  // ── Parties band (3 columns: BILLED BY · BILLED TO · INVOICE) ──
  parties: {
    flexDirection: "row",
    marginTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.4,
    borderBottomColor: COLORS.ruleSoft,
  },
  partyCol3: { width: "33.33%", paddingRight: 10 },
  partyColLast: { width: "33.33%", paddingLeft: 10 },
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

  colDate: { width: 64 },
  colVehicle: { width: 82 },
  colHsn: { width: 50 },
  colPart: { flex: 1 },
  colUnits: { width: 46 },
  colRate: { width: 56 },
  colAmount: { width: 76 },

  // ── Carry rows ──
  carryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 0.4,
    borderTopColor: COLORS.ruleSoft,
  },
  // NotoSansMono is registered without an italic face, so do NOT set
  // fontStyle: "italic" here, @react-pdf throws "Could not resolve font"
  // on multi-page invoices (which are the only ones that render carry rows).
  carryRowBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 260,
    fontSize: 9.5,
    color: COLORS.muted,
    paddingVertical: 1,
  },
  carryRowGrand: {
    color: COLORS.text,
  },
  broughtForwardWrap: {
    marginTop: 4,
    paddingBottom: 4,
    borderBottomWidth: 0.25,
    borderBottomColor: COLORS.ruleSoft,
  },

  // ── Totals (last page only) ──
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.ruleStrong,
  },
  totalsBox: { width: 260 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1.5,
    fontSize: 9.5,
  },
  totalsLabel: { color: COLORS.text },
  totalsLabelBold: { color: COLORS.text, fontWeight: 700 },
  totalsValue: { color: COLORS.text },
  totalsValueMuted: { color: COLORS.muted },
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

  // ── Fixed terms footer ──
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

export function groupLines(lines: InvoiceLine[]): LineGroup[] {
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

/**
 * Parse the display date string ("17/4/26" or "15/4/26\nto\n16/4/26")
 * into a YYYYMMDD integer for chronological sorting. Multi-day trips
 * sort by their START date. Returns 0 for null/unparseable so those
 * groups land at the top, unusual but stable.
 */
function dateSortKey(s: string | null | undefined): number {
  if (!s) return 0;
  const first = s.split("\n")[0]?.trim() ?? "";
  const m = first.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!m) return 0;
  const [, d, mo, yy] = m;
  return (2000 + Number(yy)) * 10000 + Number(mo) * 100 + Number(d);
}

function sumLines(lines: InvoiceLine[]): number {
  return Math.round(lines.reduce((s, l) => s + Number(l.amount ?? 0), 0) * 100) / 100;
}

/**
 * Pack groups into pages. Page 1 has a smaller budget (header + parties
 * eat space); subsequent pages have a bigger budget.
 *
 * The totals block lives on the last page with its lines. When the last
 * page is too full to also hold the totals, we move trailing trip groups
 * onto a fresh page so the totals travel with real lines, never on a page
 * of their own. This means a normal single-page invoice keeps its lines
 * and totals on ONE page, and carried / brought forward only appear when
 * line items truly span more than one page.
 */
export function paginateGroups(groups: LineGroup[]): LineGroup[][] {
  const pages: LineGroup[][] = [];
  let current: LineGroup[] = [];
  let currentCost = 0;
  for (const g of groups) {
    const budget = pages.length === 0 ? FIRST_PAGE_BUDGET : NEXT_PAGE_BUDGET;
    const cost = g.lines.length + GROUP_OVERHEAD;
    if (currentCost + cost > budget && current.length > 0) {
      pages.push(current);
      current = [];
      currentCost = 0;
    }
    current.push(g);
    currentCost += cost;
  }
  if (current.length > 0) pages.push(current);

  // Make room for the totals block on the last page. Only move groups when
  // the last page genuinely cannot fit the totals alongside them, and never
  // strand the totals on a page with no lines (keep at least one group with
  // them).
  if (pages.length > 0) {
    let lastIdx = pages.length - 1;
    let lastBudget = lastIdx === 0 ? FIRST_PAGE_BUDGET : NEXT_PAGE_BUDGET;
    let lastCost = groupsCost(pages[lastIdx]);
    while (
      lastCost + TOTALS_RESERVE > lastBudget &&
      pages[lastIdx].length > 1
    ) {
      const moved = pages[lastIdx].pop();
      if (!moved) break;
      pages.push([moved]);
      lastIdx = pages.length - 1;
      lastBudget = NEXT_PAGE_BUDGET; // a moved page is never page 1
      lastCost = groupsCost(pages[lastIdx]);
    }
  }
  return pages;
}

function ColumnHeader() {
  return (
    <View fixed style={styles.thRow}>
      <Text style={[styles.th, styles.colDate]}>Date</Text>
      <Text style={[styles.th, styles.colVehicle]}>Vehicle / Type</Text>
      <Text style={[styles.th, styles.colHsn]}>HSN Code</Text>
      <Text style={[styles.th, styles.colPart]}>Particulars</Text>
      <Text style={[styles.th, styles.colUnits, styles.thNum]}>Units</Text>
      <Text style={[styles.th, styles.colRate, styles.thNum]}>Rate</Text>
      <Text style={[styles.th, styles.colAmount, styles.thNum]}>Amount</Text>
    </View>
  );
}

function TripGroupBlock({ group, isFirst }: { group: LineGroup; isFirst: boolean }) {
  const vehicle = group.lines[0]?.vehicle_label ?? "";
  const firstDate = group.lines[0]?.date ?? "";
  const hsn = group.lines[0]?.hsn_code ?? "";
  return (
    <View
      wrap={false}
      style={[styles.groupBlock, !isFirst ? styles.groupBlockDivider : {}]}
    >
      {group.lines.map((l, li) => {
        const isFirstLineOfGroup = li === 0;
        return (
          <View key={l.id} style={styles.tr}>
            <Text style={[styles.td, styles.colDate]}>
              {isFirstLineOfGroup ? firstDate : ""}
            </Text>
            <Text style={[styles.td, styles.colVehicle, styles.tdMuted]}>
              {isFirstLineOfGroup ? vehicle : ""}
            </Text>
            <Text style={[styles.td, styles.colHsn, styles.tdMuted]}>
              {isFirstLineOfGroup ? hsn : ""}
            </Text>
            <Text style={[styles.td, styles.colPart]}>
              {l.particulars ?? ""}
            </Text>
            <Text style={[styles.td, styles.colUnits, styles.tdNum]}>
              {formatQtyDash(l.qty)}
            </Text>
            <Text style={[styles.td, styles.colRate, styles.tdNum]}>
              {formatINRDash(l.rate)}
            </Text>
            <Text style={[styles.td, styles.colAmount, styles.tdNum]}>
              {formatINRDash(l.amount)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function BroughtForwardRow({ amount }: { amount: number }) {
  return (
    <View wrap={false} style={styles.broughtForwardWrap}>
      <View style={[styles.carryRowBox, { marginLeft: "auto" }]}>
        <Text>Brought forward</Text>
        <Text style={styles.carryRowGrand}>{formatINR(amount)}</Text>
      </View>
    </View>
  );
}

function CarryForwardRow({
  pageSubtotal,
  carried,
}: {
  pageSubtotal: number;
  carried: number;
}) {
  // wrap={false} keeps "Page subtotal" and "Carried forward" together.
  // Without it @react-pdf was splitting them across pages: the subtotal
  // line landed at the bottom of page 1, "Carried forward" got pushed to
  // a fresh page on its own, and the next logical page started on page 3
  //, yielding a near-empty page 2 in multi-page invoices.
  return (
    <View wrap={false} style={styles.carryRow}>
      <View style={{ width: 260 }}>
        <View style={styles.carryRowBox}>
          <Text>Page subtotal</Text>
          <Text>{formatINR(pageSubtotal)}</Text>
        </View>
        <View style={[styles.carryRowBox, styles.carryRowGrand]}>
          <Text>Carried forward</Text>
          <Text>{formatINR(carried)}</Text>
        </View>
      </View>
    </View>
  );
}

function TotalsBlock({ invoice }: { invoice: Invoice }) {
  const isRcm = invoice.gst_mode === "RCM";
  // GST rows are kept under RCM (informational) but hidden when the
  // value is zero under any other mode.
  const showCgst = isRcm || (invoice.gst_mode === "CGST_SGST" && invoice.cgst !== 0);
  const showSgst = isRcm || (invoice.gst_mode === "CGST_SGST" && invoice.sgst !== 0);
  const showIgst = invoice.gst_mode === "IGST" && invoice.igst !== 0;
  const cgstLabel = isRcm ? "CGST @ 2.5% Under RCM" : "CGST @ 2.5%";
  const sgstLabel = isRcm ? "SGST @ 2.5% Under RCM" : "SGST @ 2.5%";

  return (
    <View wrap={false}>
      <View style={styles.totalsWrap}>
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabelBold}>Total</Text>
            <Text style={styles.totalsValue}>{formatINR(invoice.subtotal)}</Text>
          </View>
          {showCgst && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{cgstLabel}</Text>
              <Text style={isRcm ? styles.totalsValueMuted : {}}>
                {isRcm ? "-" : formatINRBlank(invoice.cgst)}
              </Text>
            </View>
          )}
          {showSgst && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>{sgstLabel}</Text>
              <Text style={isRcm ? styles.totalsValueMuted : {}}>
                {isRcm ? "-" : formatINRBlank(invoice.sgst)}
              </Text>
            </View>
          )}
          {showIgst && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IGST @ 5%</Text>
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
      <Text style={styles.words}>In Words: {invoice.amount_in_words}</Text>
    </View>
  );
}

function TermsFooter({ terms }: { terms: string[] }) {
  return (
    <View fixed style={styles.foot}>
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
  );
}

function HeaderBand({
  company,
  invoice,
  fullNumber,
  brand,
}: {
  company: InvoicePdfProps["company"];
  invoice: Invoice;
  fullNumber: string;
  brand: PdfBrand | undefined;
}) {
  const phones = [company.phone, company.phone2].filter(Boolean).join(", ");
  const invoiceEmail = company.invoice_email ?? company.email ?? "";
  const hasPeriod = Boolean(invoice.period_from && invoice.period_to);

  return (
    <>
      {/* Top band, brand left, TAX INVOICE / Original for Recipient right. */}
      <View style={styles.topBand}>
        <PdfBrandHeading
          brand={brand}
          companyName={company.name ?? ""}
          fontFamily={INVOICE_FONT_FAMILY}
        />
        <View style={styles.topRight}>
          <Text style={styles.taxInvoiceTitle}>TAX INVOICE</Text>
          <Text style={styles.taxInvoiceSub}>Original for Recipient</Text>
        </View>
      </View>

      {/* 3-column parties band, BILLED BY · BILLED TO · INVOICE. */}
      <View style={styles.parties}>
        <View style={styles.partyCol3}>
          <Text style={styles.partyLabel}>BILLED BY</Text>
          <Text style={styles.partyTextBold}>{company.name}</Text>
          {company.gstin && (
            <Text style={styles.partyText}>GSTIN {company.gstin}</Text>
          )}
          {phones && <Text style={styles.partyText}>{phones}</Text>}
          {invoiceEmail && <Text style={styles.partyText}>{invoiceEmail}</Text>}
          {company.address && (
            <Text style={styles.partyText}>{company.address}</Text>
          )}
        </View>

        <View style={styles.partyCol3}>
          <Text style={styles.partyLabel}>BILLED TO</Text>
          <Text style={styles.partyTextBold}>{invoice.client_name ?? ""}</Text>
          {invoice.client_address && (
            <Text style={styles.partyText}>{invoice.client_address}</Text>
          )}
          <Text style={styles.partyText}>
            {invoice.client_gstin
              ? `GSTIN ${invoice.client_gstin}`
              : "GSTIN NA"}
          </Text>
          {invoice.client_booked_by && (
            <Text style={styles.partyText}>
              Booked By: {invoice.client_booked_by}
            </Text>
          )}
        </View>

        <View style={styles.partyColLast}>
          <Text style={styles.partyLabel}>INVOICE</Text>
          <Text style={styles.partyTextBold}>No. {fullNumber}</Text>
          <Text style={styles.partyText}>
            Date: {fmtDate(invoice.invoice_date)}
          </Text>
          {hasPeriod && (
            <Text style={styles.partyText}>
              Period: {fmtDate(invoice.period_from)} – {fmtDate(invoice.period_to)}
            </Text>
          )}
        </View>
      </View>
    </>
  );
}

export function InvoicePdf({ company, invoice, lines, brand }: InvoicePdfProps) {
  const fullNumber = `${company.invoice_prefix ?? ""}${invoice.invoice_number}`;
  // Sort lines by stored sort_order first (preserves the order of lines
  // WITHIN a trip), group them, then sort whole groups chronologically by
  // their first line's date. Result: trips listed oldest → newest, with
  // each trip's internal line order (total / additional kms / hrs / night)
  // intact.
  const grouped = groupLines(
    [...lines].sort((a, b) => a.sort_order - b.sort_order),
  );
  const groups = [...grouped].sort(
    (a, b) =>
      dateSortKey(a.lines[0]?.date) - dateSortKey(b.lines[0]?.date),
  );
  const terms = (company.terms_invoice ?? []).filter(Boolean);
  const pages = paginateGroups(groups);

  return (
    <Document title={`Invoice ${fullNumber}`}>
      {pages.map((pageGroups, pi) => {
        const isFirstPage = pi === 0;
        const isLastPage = pi === pages.length - 1;
        const broughtForward = sumLines(
          pages
            .slice(0, pi)
            .flat()
            .flatMap((g) => g.lines),
        );
        const pageSubtotal = sumLines(pageGroups.flatMap((g) => g.lines));
        const carriedForward = broughtForward + pageSubtotal;

        return (
          <Page key={pi} size="A4" style={styles.page} wrap>
            {isFirstPage && (
              <HeaderBand
                company={company}
                invoice={invoice}
                fullNumber={fullNumber}
                brand={brand}
              />
            )}
            <ColumnHeader />
            {!isFirstPage && <BroughtForwardRow amount={broughtForward} />}

            {pageGroups.map((group, gi) => (
              <TripGroupBlock
                key={group.trip_id ?? `g${pi}-${gi}`}
                group={group}
                isFirst={gi === 0}
              />
            ))}

            {!isLastPage && (
              <CarryForwardRow
                pageSubtotal={pageSubtotal}
                carried={carriedForward}
              />
            )}
            {isLastPage && <TotalsBlock invoice={invoice} />}

            <TermsFooter terms={terms} />
            <Text
              fixed
              style={styles.pageNum}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
          </Page>
        );
      })}
    </Document>
  );
}
