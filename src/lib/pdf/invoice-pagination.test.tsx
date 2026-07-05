/**
 * Pagination correctness, checked against real rendered output.
 *
 * The invoice PDF paginates trip groups manually (paginateGroups) so it can
 * print accounting-style "Page subtotal / Carried forward" and "Brought
 * forward" markers and keep the totals block with real lines. The manual plan
 * is only correct if react-pdf physically produces exactly the pages we
 * planned: if a group or the totals block silently overflows onto an extra
 * physical page, the carry markers land on the wrong page.
 *
 * These tests render to a real PDF buffer and read the physical page count
 * back with pdf-parse, asserting it equals paginateGroups' prediction. They
 * also lock in that a normal month's invoice (METALMAN 2124, ~21 rows) stays
 * on a single page rather than spilling a near-empty second page.
 */
import { describe, it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { PDFParse } from "pdf-parse";
import { InvoicePdf } from "./invoice-pdf";
import { groupLines, paginateGroups } from "./invoice-pdf-doc";
import type { Company, Invoice, InvoiceLine } from "@/lib/supabase/types";

const company: Pick<
  Company,
  | "name" | "address" | "gstin" | "phone" | "phone2"
  | "email" | "invoice_email" | "invoice_prefix" | "terms_invoice"
> = {
  name: "Krishna Cabs",
  address: "592, FF, HBC, Sector 51, Gurugram- 122018 (HR)",
  gstin: "06AAKFK3109Q2ZY",
  phone: "+91 9999004016",
  phone2: null,
  email: "s9999004016@gmail.com",
  invoice_email: null,
  invoice_prefix: "",
  terms_invoice: [
    "Subjected to Gurugram Jurisdiction.",
    "Our Responsibility of the signed duty slip rests till we handover the same to you with the bill.",
    "Interest @ 18% will be charged if payment is not received within 15 days from the date of bill.",
    "System generated invoice, needs no signature,",
  ],
};

function makeInvoice(): Invoice {
  return {
    id: "inv", company_id: "c", invoice_number: 2124, invoice_date: "2026-06-30",
    client_id: "cl", client_name: "METALMAN AUTO LTD",
    client_address: "JMK Tower, 1st Floor, 44/5, NH 8, Kapashehra Estate (GGN-Delhi Border), New Delhi 110037",
    client_gstin: "07AABCM5441M2ZA", client_booked_by: "Mr. Pratap",
    period_from: "2026-06-01", period_to: "2026-06-30",
    subtotal: 27317, gst_mode: "IGST", cgst: 0, sgst: 0, igst: 1365.85,
    toll_total: 2175, toll_label: "Toll, Tax & Parking",
    net_amount: 30857.85, amount_in_words: "Thirty Thousand Eight Hundred & Fifty Eight Only.",
    status: "unpaid", paid_date: null, pdf_url: null, created_by: null,
    created_at: "2026-06-30", updated_at: "2026-06-30",
  };
}

// N trip groups of `linesPer` lines each.
function makeUniform(n: number, linesPer: number): InvoiceLine[] {
  const out: InvoiceLine[] = [];
  let sort = 0;
  for (let t = 0; t < n; t++) {
    for (let i = 0; i < linesPer; i++) {
      out.push({
        id: `l-${t}-${i}`, invoice_id: "inv", trip_id: `trip-${t}`,
        date: `${(t % 28) + 1}/6/26`, vehicle_label: "9083 Sonet", hsn_code: "996601",
        particulars: i === 0 ? "80kms/8hrs" : "Additional kms",
        qty: i === 0 ? null : 69, rate: i === 0 ? 1600 : 15, amount: i === 0 ? 1600 : 1035,
        sort_order: sort++,
      });
    }
  }
  return out;
}

// The exact METALMAN invoice 2124 (9 groups, 21 rows) that a customer sent in
// as a two-page PDF whose second page was almost entirely blank.
function metalman(): InvoiceLine[] {
  const trips: Array<Array<[string, string, string, number | null, number | null, number]>> = [
    [["1/6/26", "9083 Sonet", "80kms/8hrs", null, 1600, 1600]],
    [["1/6/26", "5392 Crysta", "80kms/8hrs", null, 2400, 2400]],
    [["1/6/26", "9083 Sonet", "80kms/8hrs", null, 1600, 1600], ["1/6/26", "9083 Sonet", "Night Charges", 1, 300, 300]],
    [["3/6/26", "6403 Dzire", "Total 192kms", null, null, 0], ["3/6/26", "6403 Dzire", "80kms/8hrs", null, 1500, 1500], ["3/6/26", "6403 Dzire", "Additional kms", 112, 15, 1680], ["3/6/26", "6403 Dzire", "Additional hrs", 2.5, 150, 375]],
    [["10/6/26", "9083 Sonet", "80kms/8hrs", null, 1600, 1600], ["10/6/26", "9083 Sonet", "Night Charges", 1, 300, 300]],
    [["18/6/26", "9083 Sonet", "80kms/8hrs", null, 1600, 1600], ["18/6/26", "9083 Sonet", "Night Charges", 1, 300, 300]],
    [["24/6/26", "9083 Sonet", "Total 155kms", null, null, 0], ["24/6/26", "9083 Sonet", "80kms/8hrs", null, 1600, 1600], ["24/6/26", "9083 Sonet", "Additional kms", 75, 16, 1200], ["24/6/26", "9083 Sonet", "Additional hrs", 3, 150, 450]],
    [["29/6/26", "9083 Sonet", "Total 158kms", null, null, 0], ["29/6/26", "9083 Sonet", "80kms/8hrs", null, 1600, 1600], ["29/6/26", "9083 Sonet", "Additional kms", 78, 16, 1248]],
    [["30/6/26", "9083 Sonet", "Total kms 479", 479, 16, 7664], ["30/6/26", "9083 Sonet", "Driver's TA", 1, 300, 300]],
  ];
  const out: InvoiceLine[] = [];
  let sort = 0;
  trips.forEach((trip, ti) => trip.forEach((r, ri) => out.push({
    id: `l-${ti}-${ri}`, invoice_id: "inv", trip_id: `trip-${ti}`, date: r[0],
    vehicle_label: r[1], hsn_code: "996601", particulars: r[2], qty: r[3], rate: r[4], amount: r[5], sort_order: sort++,
  })));
  return out;
}

async function physicalPages(lines: InvoiceLine[]): Promise<number> {
  const buf = await renderToBuffer(<InvoicePdf company={company} invoice={makeInvoice()} lines={lines} />);
  return (await new PDFParse({ data: buf }).getText()).total;
}

function logicalPages(lines: InvoiceLine[]): number {
  return paginateGroups(groupLines(lines)).length;
}

describe("invoice pagination", () => {
  it("a normal month (METALMAN 2124, 21 rows) fits on one page", async () => {
    const lines = metalman();
    expect(logicalPages(lines)).toBe(1);
    expect(await physicalPages(lines)).toBe(1);
  }, 30000);

  // The safety net: whatever paginateGroups plans, react-pdf must physically
  // produce. physical > logical means a group or the totals block overflowed
  // onto an unplanned page, which would misplace the carry-forward markers.
  it("never over-budgets: physical pages == planned pages, across shapes", async () => {
    const cases: Array<[groups: number, linesPer: number]> = [
      [1, 1], [7, 4], [8, 4], [9, 3], [6, 5], [12, 4], [18, 4], [19, 4],
    ];
    for (const [groups, linesPer] of cases) {
      const lines = makeUniform(groups, linesPer);
      expect(
        await physicalPages(lines),
        `${groups} groups x ${linesPer} rows`,
      ).toBe(logicalPages(lines));
    }
  }, 120000);
});
