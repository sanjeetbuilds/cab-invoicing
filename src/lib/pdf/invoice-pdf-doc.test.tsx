/**
 * Pagination regression tests for the invoice PDF. The bug these guard
 * against: a normal one-page invoice spilling its totals onto a near-empty
 * second page. We render real PDFs and count physical pages.
 */
import path from "node:path";
import { describe, it, expect } from "vitest";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import {
  InvoicePdf,
  INVOICE_FONT_FAMILY,
  groupLines,
  paginateGroups,
} from "./invoice-pdf-doc";
import type { Invoice, InvoiceLine, Company } from "@/lib/supabase/types";

const fontFile = path.join(process.cwd(), "public", "fonts", "NotoSansMono.ttf");
Font.register({
  family: INVOICE_FONT_FAMILY,
  fonts: [
    { src: fontFile, fontWeight: 400 },
    { src: fontFile, fontWeight: 700 },
  ],
});

const company = {
  name: "Krishna Cabs",
  address: "Sector 14, Gurugram, Haryana",
  gstin: "06ABCDE1234F1Z5",
  phone: "9876543210",
  phone2: null,
  email: "krishna@example.com",
  invoice_email: null,
  invoice_prefix: "",
  terms_invoice: ["Payment due in 15 days.", "Subject to Gurugram jurisdiction."],
} as Company;

// RCM shows the most totals rows (CGST + SGST + toll), the tallest totals
// block, so it is the worst case for fitting totals on the last page.
const invoice = {
  id: "i", company_id: "c", invoice_number: 2123, invoice_date: "2026-04-30",
  client_id: "cl", client_name: "Metalman Auto Pvt Ltd", client_address: "Manesar",
  client_gstin: "06ZZZZZ0000Z1Z0", client_booked_by: "Mr Rao",
  period_from: "2026-04-01", period_to: "2026-04-30",
  subtotal: 100000, gst_mode: "RCM", cgst: 2500, sgst: 2500, igst: 0,
  toll_total: 1200, toll_label: "Toll & Parking", net_amount: 106200,
  amount_in_words: "One lakh six thousand two hundred only", status: "unpaid",
  paid_date: null, pdf_url: null, created_by: null, created_at: "", updated_at: "",
} as Invoice;

function build(trips: number, linesPer: number): InvoiceLine[] {
  const out: InvoiceLine[] = [];
  let o = 0;
  for (let t = 0; t < trips; t++) {
    for (let l = 0; l < linesPer; l++) {
      out.push({
        id: `t${t}l${l}`, invoice_id: "i", trip_id: `trip-${t}`,
        date: `${1 + (t % 28)}/4/26`, vehicle_label: "HR26ED9083 / Innova",
        hsn_code: "996601", particulars: l === 0 ? "Local 8hr / 80km" : "Extra km",
        qty: 1, rate: 2500, amount: 2500, sort_order: o++,
      } as InvoiceLine);
    }
  }
  return out;
}

function countPages(buf: Buffer): number {
  const m = buf.toString("latin1").match(/\/Type\s*\/Page(?![s])/g);
  return m ? m.length : 0;
}

describe("invoice PDF pagination", () => {
  it("a 2123-style invoice (4 trips, 16 rows) fits on ONE page", async () => {
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={invoice} lines={build(4, 4)} />,
    );
    expect(countPages(buf)).toBe(1);
  }, 20000);

  it("a genuinely long invoice still paginates onto more than one page", async () => {
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={invoice} lines={build(30, 3)} />,
    );
    expect(countPages(buf)).toBeGreaterThan(1);
  }, 20000);

  it("never orphans the totals: physical pages equal the packer's pages", async () => {
    // If the rendered PDF ever has more physical pages than the packer
    // planned, the totals (or lines) overflowed onto an unplanned page.
    const shapes: [number, number][] = [
      [3, 4], [5, 3], [6, 3], [8, 2], [10, 2], [13, 1], [20, 3],
    ];
    for (const [trips, linesPer] of shapes) {
      const lines = build(trips, linesPer);
      const manual = paginateGroups(groupLines(lines)).length;
      const buf = await renderToBuffer(
        <InvoicePdf company={company} invoice={invoice} lines={lines} />,
      );
      expect(countPages(buf), `${trips}x${linesPer}`).toBe(manual);
    }
  }, 30000);
});
