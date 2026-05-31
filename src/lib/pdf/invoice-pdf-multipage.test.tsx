import { describe, it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "./invoice-pdf";
import type { Company, Invoice, InvoiceLine } from "@/lib/supabase/types";

const company: Pick<
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
> = {
  name: "Krishna Cabs",
  address: "House No. 1, Bharat Vihar, Gurugram, Haryana 122004",
  gstin: "06AAACK1234A1ZQ",
  phone: "+91 98000 00000",
  phone2: null,
  email: "krishnacabs@example.com",
  invoice_email: null,
  invoice_prefix: "",
  terms_invoice: [
    "Subjected to Gurugram Jurisdiction.",
    "Payment due within 30 days of invoice date.",
  ],
};

function makeInvoice(): Invoice {
  return {
    id: "inv-multi-test",
    company_id: "c",
    invoice_number: 9999,
    invoice_date: "2026-04-30",
    client_id: "client-fhpl",
    client_name: "Family Health Plan Insurance TPA Ltd",
    client_address: null,
    client_gstin: "06AAACF1740R1ZH",
    client_booked_by: "Ms. Gagandeep",
    period_from: "2026-04-01",
    period_to: "2026-04-30",
    subtotal: 50000,
    gst_mode: "RCM",
    cgst: 0,
    sgst: 0,
    igst: 0,
    toll_total: 0,
    toll_label: null,
    net_amount: 50000,
    amount_in_words: "Fifty Thousand Only.",
    status: "unpaid",
    paid_date: null,
    pdf_url: null,
    created_by: null,
    created_at: "2026-04-30",
    updated_at: "2026-04-30",
  };
}

// Build N trip groups of 4 lines each, like real FHPL invoices.
function makeLines(tripCount: number): InvoiceLine[] {
  const out: InvoiceLine[] = [];
  let sort = 0;
  for (let t = 0; t < tripCount; t++) {
    const tripId = `trip-${t}`;
    out.push({
      id: `l-${t}-a`,
      invoice_id: "inv-multi-test",
      trip_id: tripId,
      date: `${(t % 28) + 1}/4/26`,
      vehicle_label: "9083 Sonet",
      hsn_code: "996601",
      particulars: "Total 149kms\n80kms/8hrs",
      qty: null,
      rate: null,
      amount: 1500,
      sort_order: sort++,
    });
    out.push({
      id: `l-${t}-b`,
      invoice_id: "inv-multi-test",
      trip_id: tripId,
      date: `${(t % 28) + 1}/4/26`,
      vehicle_label: "9083 Sonet",
      hsn_code: "996601",
      particulars: "Additional kms",
      qty: 69,
      rate: 15,
      amount: 1035,
      sort_order: sort++,
    });
    out.push({
      id: `l-${t}-c`,
      invoice_id: "inv-multi-test",
      trip_id: tripId,
      date: `${(t % 28) + 1}/4/26`,
      vehicle_label: "9083 Sonet",
      hsn_code: "996601",
      particulars: "Additional hrs",
      qty: 1.5,
      rate: 100,
      amount: 150,
      sort_order: sort++,
    });
    out.push({
      id: `l-${t}-d`,
      invoice_id: "inv-multi-test",
      trip_id: tripId,
      date: `${(t % 28) + 1}/4/26`,
      vehicle_label: "9083 Sonet",
      hsn_code: "996601",
      particulars: "Night Charges",
      qty: null,
      rate: null,
      amount: 300,
      sort_order: sort++,
    });
  }
  return out;
}

describe("InvoicePdf, multi-page", () => {
  it("2 trips × 4 lines (single page baseline)", async () => {
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={makeInvoice()} lines={makeLines(2)} />,
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("10 trips × 4 lines = 40 rows (spans 2 pages)", async () => {
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={makeInvoice()} lines={makeLines(10)} />,
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("20 trips × 4 lines = 80 rows (spans 3+ pages)", async () => {
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={makeInvoice()} lines={makeLines(20)} />,
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("exactly at FIRST_PAGE_BUDGET (30 rows = 7.5 trips)", async () => {
    // 8 trips × 4 lines = 32, just over the first-page budget
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={makeInvoice()} lines={makeLines(8)} />,
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders even when input lines arrive in non-chronological order", async () => {
    // Build chronologically, then shuffle group order to simulate the bug
    // we're fixing: trips entered out of order.
    const lines = makeLines(5);
    // group ids are trip-0..trip-4, dates 1/4/26..5/4/26
    const groups: Record<string, typeof lines> = {};
    for (const l of lines) (groups[l.trip_id!] ??= []).push(l);
    const shuffled = [
      ...groups["trip-2"],
      ...groups["trip-0"],
      ...groups["trip-4"],
      ...groups["trip-1"],
      ...groups["trip-3"],
    ];
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={makeInvoice()} lines={shuffled} />,
    );
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
