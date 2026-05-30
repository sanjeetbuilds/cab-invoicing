/**
 * Visual eyeball test: renders a 2-trip invoice mixing one Local duty
 * with one Transfer (Airport T3 Drop) duty into ./fhpl-mixed-sample.pdf,
 * so we can confirm the PDF renders both formats in the same bill.
 * SAMPLE=1 to actually produce the file.
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
  address: "House No. 1, Bharat Vihar,\nGurugram, Haryana 122004",
  gstin: "06AAKFK1234A1Z9",
  phone: "+91 9999 00 4016",
  phone2: null,
  email: "krishnacabs@example.com",
  invoice_email: "s9999004016@gmail.com",
  invoice_prefix: "",
  terms_invoice: ["Subjected to Gurugram Jurisdiction."],
};

const invoice: Invoice = {
  id: "inv-mixed",
  company_id: "c",
  invoice_number: 2028,
  invoice_date: "2026-05-30",
  client_id: "client-x",
  client_name: "Family Health Plan Insurance TPA Ltd",
  client_address: null,
  client_gstin: "06AAACF1740R1ZH",
  client_booked_by: "Ms. Gagandeep",
  period_from: "2026-05-01",
  period_to: "2026-05-30",
  subtotal: 4485,
  gst_mode: "RCM",
  cgst: 0,
  sgst: 0,
  igst: 0,
  toll_total: 0,
  toll_label: null,
  net_amount: 4485,
  amount_in_words: "Four Thousand Four Hundred & Eighty Five Only.",
  status: "unpaid",
  paid_date: null,
  pdf_url: null,
  created_by: null,
  created_at: "2026-05-30",
  updated_at: "2026-05-30",
};

// Lines mimic what invoice-builder would emit for: one Local FHPL duty
// (149 km, 9.5 hr, 1 night) + one Transfer (Airport T3 Drop, fixed).
const lines: InvoiceLine[] = [
  // Local trip
  { id: "l1", invoice_id: invoice.id, trip_id: "trip-local", date: "10/5/26",
    vehicle_label: "9083 Sonet", hsn_code: "996601",
    particulars: "Total 149kms\n80kms/8hrs", qty: null, rate: null,
    amount: 1500, sort_order: 0 },
  { id: "l2", invoice_id: invoice.id, trip_id: "trip-local", date: "10/5/26",
    vehicle_label: "9083 Sonet", hsn_code: "996601",
    particulars: "Additional kms", qty: 69, rate: 15,
    amount: 1035, sort_order: 1 },
  { id: "l3", invoice_id: invoice.id, trip_id: "trip-local", date: "10/5/26",
    vehicle_label: "9083 Sonet", hsn_code: "996601",
    particulars: "Additional hrs", qty: 1.5, rate: 100,
    amount: 150, sort_order: 2 },
  { id: "l4", invoice_id: invoice.id, trip_id: "trip-local", date: "10/5/26",
    vehicle_label: "9083 Sonet", hsn_code: "996601",
    particulars: "Night Charges", qty: null, rate: null,
    amount: 300, sort_order: 3 },

  // Transfer trip — single fixed-price line
  { id: "l5", invoice_id: invoice.id, trip_id: "trip-transfer", date: "15/5/26",
    vehicle_label: "9083 Sonet", hsn_code: "996601",
    particulars: "Airport T3 Drop", qty: null, rate: null,
    amount: 1500, sort_order: 4 },
];

describe.runIf(process.env.SAMPLE === "1")("FHPL mixed sample PDF", () => {
  it("renders local + transfer duties together in one invoice", async () => {
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={invoice} lines={lines} />,
    );
    const out = path.join(process.cwd(), "fhpl-mixed-sample.pdf");
    fs.writeFileSync(out, buf);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    // eslint-disable-next-line no-console
    console.log(`Wrote ${out} (${buf.length} bytes)`);
  });
});
