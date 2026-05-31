/**
 * Renders a sample FHPL multi-page invoice to ./fhpl-sample.pdf so we can
 * eyeball the new TAX INVOICE header, BILLED BY GSTIN position, and the
 * chronological date sort with out-of-order input trips.
 *
 * NOT a regression test, only runs when SAMPLE=1 is set so CI stays fast.
 */
import path from "node:path";
import fs from "node:fs";
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
  address:
    "House No. 1, Bharat Vihar,\nKherki Daula, Sector 84,\nGurugram, Haryana 122004",
  gstin: "06AAKFK1234A1Z9",
  phone: "+91 9999 00 4016",
  phone2: null,
  email: "krishnacabs@example.com",
  invoice_email: "s9999004016@gmail.com",
  invoice_prefix: "",
  terms_invoice: [
    "Subjected to Gurugram Jurisdiction.",
    "Payment due within 30 days of invoice date.",
    "System generated invoice, needs no signature.",
  ],
};

const invoice: Invoice = {
  id: "inv-fhpl-sample",
  company_id: "c",
  invoice_number: 2027,
  invoice_date: "2026-05-31",
  client_id: "client-fhpl",
  client_name: "Family Health Plan Insurance TPA Ltd",
  client_address: null,
  client_gstin: "06AAACF1740R1ZH",
  client_booked_by: "Ms. Gagandeep",
  period_from: "2026-05-01",
  period_to: "2026-05-28",
  subtotal: 29850,
  gst_mode: "RCM",
  cgst: 0,
  sgst: 0,
  igst: 0,
  toll_total: 0,
  toll_label: null,
  net_amount: 29850,
  amount_in_words:
    "Twenty Nine Thousand Eight Hundred & Fifty Only.",
  status: "unpaid",
  paid_date: null,
  pdf_url: null,
  created_by: null,
  created_at: "2026-05-31",
  updated_at: "2026-05-31",
};

// 10 trips, intentionally INPUT in out-of-order dates, the renderer
// should sort them ascending. If sort works the PDF lists 1/5 → 27/5.
const tripDates = [
  "10/5/26", "3/5/26",  "21/5/26", "7/5/26",  "15/5/26",
  "1/5/26",  "27/5/26", "12/5/26", "5/5/26",  "19/5/26",
];

const lines: InvoiceLine[] = [];
let sort = 0;
tripDates.forEach((date, t) => {
  const tripId = `trip-${t}`;
  lines.push(
    { id: `l-${t}-a`, invoice_id: invoice.id, trip_id: tripId, date,
      vehicle_label: "9083 Sonet", hsn_code: "996601",
      particulars: "Total 149kms\n80kms/8hrs",
      qty: null, rate: null, amount: 1500, sort_order: sort++ },
    { id: `l-${t}-b`, invoice_id: invoice.id, trip_id: tripId, date,
      vehicle_label: "9083 Sonet", hsn_code: "996601",
      particulars: "Additional kms",
      qty: 69, rate: 15, amount: 1035, sort_order: sort++ },
    { id: `l-${t}-c`, invoice_id: invoice.id, trip_id: tripId, date,
      vehicle_label: "9083 Sonet", hsn_code: "996601",
      particulars: "Additional hrs",
      qty: 1.5, rate: 100, amount: 150, sort_order: sort++ },
    { id: `l-${t}-d`, invoice_id: invoice.id, trip_id: tripId, date,
      vehicle_label: "9083 Sonet", hsn_code: "996601",
      particulars: "Night Charges",
      qty: null, rate: null, amount: 300, sort_order: sort++ },
  );
});

describe.runIf(process.env.SAMPLE === "1")("FHPL sample PDF", () => {
  it("renders multi-page sample to ./fhpl-sample.pdf", async () => {
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={invoice} lines={lines} />,
    );
    const out = path.join(process.cwd(), "fhpl-sample.pdf");
    fs.writeFileSync(out, buf);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    // eslint-disable-next-line no-console
    console.log(
      `Wrote ${out} (${buf.length} bytes, ${lines.length} lines, ${tripDates.length} trips)`,
    );
  });
});
