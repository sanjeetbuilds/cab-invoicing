import { describe, it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "./invoice-pdf";
import type {
  Company,
  Invoice,
  InvoiceLine,
} from "@/lib/supabase/types";

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
  gstin: "06AAACK1234A1ZQ",
  phone: "+91 98000 00000",
  phone2: null,
  email: "krishnacabs@example.com",
  invoice_email: null,
  invoice_prefix: "",
  terms_invoice: [
    "Subjected to Gurugram Jurisdiction.",
    "Payment due within 30 days of invoice date.",
    "System generated invoice, needs no signature.",
  ],
};

const baseInvoice: Invoice = {
  id: "inv-fhpl-test",
  company_id: "c",
  invoice_number: 2121,
  invoice_date: "2026-04-30",
  client_id: "client-fhpl",
  client_name: "Family Health Plan Insurance TPA Ltd",
  client_address: null,
  client_gstin: "06AAACF1740R1ZH",
  client_booked_by: "Ms. Gagandeep",
  period_from: "2026-04-01",
  period_to: "2026-04-30",
  subtotal: 2985,
  gst_mode: "RCM",
  cgst: 0,
  sgst: 0,
  igst: 0,
  toll_total: 0,
  toll_label: null,
  net_amount: 2985,
  amount_in_words: "Two Thousand Nine Hundred & Eighty Five Only.",
  status: "unpaid",
  paid_date: null,
  pdf_url: null,
  created_by: null,
  created_at: "2026-04-30",
  updated_at: "2026-04-30",
};

const fhplLines: InvoiceLine[] = [
  {
    id: "l1",
    invoice_id: baseInvoice.id,
    trip_id: "trip-fhpl-1",
    date: "17/4/26",
    vehicle_label: "9083 Sonet",
    hsn_code: "996601",
    particulars: "Total 149kms\n80kms/8hrs",
    qty: null,
    rate: null,
    amount: 1500,
    sort_order: 0,
  },
  {
    id: "l2",
    invoice_id: baseInvoice.id,
    trip_id: "trip-fhpl-1",
    date: "17/4/26",
    vehicle_label: "9083 Sonet",
    hsn_code: "996601",
    particulars: "Additional kms",
    qty: 69,
    rate: 15,
    amount: 1035,
    sort_order: 1,
  },
  {
    id: "l3",
    invoice_id: baseInvoice.id,
    trip_id: "trip-fhpl-1",
    date: "17/4/26",
    vehicle_label: "9083 Sonet",
    hsn_code: "996601",
    particulars: "Additional hrs",
    qty: 1.5,
    rate: 100,
    amount: 150,
    sort_order: 2,
  },
  {
    id: "l4",
    invoice_id: baseInvoice.id,
    trip_id: "trip-fhpl-1",
    date: "17/4/26",
    vehicle_label: "9083 Sonet",
    hsn_code: "996601",
    particulars: "Night Charges",
    qty: null,
    rate: null,
    amount: 300,
    sort_order: 3,
  },
];

describe("InvoicePdf, renders to a non-empty PDF buffer", () => {
  it("FHPL RCM invoice, single page", async () => {
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={baseInvoice} lines={fhplLines} />,
    );
    expect(buf.length).toBeGreaterThan(2000);
    // PDF files start with the magic bytes "%PDF-"
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("Inter-state IGST invoice", async () => {
    const igstInvoice: Invoice = {
      ...baseInvoice,
      id: "inv-igst-test",
      client_name: "Paras Healthcare Pvt Ltd",
      gst_mode: "IGST",
      subtotal: 11205,
      igst: 560.25,
      net_amount: 12365.25,
      amount_in_words: "Twelve Thousand Three Hundred & Sixty Five Only.",
    };
    const buf = await renderToBuffer(
      <InvoicePdf company={company} invoice={igstInvoice} lines={fhplLines} />,
    );
    expect(buf.length).toBeGreaterThan(2000);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
