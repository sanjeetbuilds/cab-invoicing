// Database type stub. We can later regenerate this with the Supabase CLI:
//   supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
// For now, a minimal shape that covers what we touch in early milestones.

export type Role = "owner" | "admin" | "staff" | "viewer";
export type GstMode = "RCM" | "CGST_SGST" | "IGST";
export type TripMode = "local" | "outstation" | "transfer" | "package";
export type BillingMethod = "per_km" | "slab";
export type CarType = "Dzire" | "Sonet" | "Crysta" | "Innova" | "Ertiga" | "Other";
export type Ownership = "own" | "attached";
export type QuotationStatus = "draft" | "sent" | "accepted" | "expired" | "rejected";
export type InvoiceStatus = "draft" | "unpaid" | "paid" | "reversed";

export type BrandMode = "text_only" | "logo_only" | "logo_with_text";

export interface Company {
  id: string;
  name: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  invoice_email: string | null;
  state: string;
  invoice_prefix: string | null;
  next_invoice_number: number;
  quotation_prefix: string | null;
  next_quotation_number: number;
  terms_invoice: string[] | null;
  terms_quotation: string[] | null;
  plan: "free" | "pro";
  brand_mode: BrandMode;
  logo_url: string | null;
  logo_aspect_ratio: number | null;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  company_id: string;
  user_id: string | null;
  role: Role;
  invited_email: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  gstin: string | null;
  address: string | null;
  state: string;
  is_rcm: boolean;
  is_quick_customer: boolean;
  default_booked_by: string | null;
  notes: string | null;
  /**
   * Last reimbursement charges (toll / tax / parking) entered for this client
   * on the build screen. Persisted on every issue/draft so the charges box can
   * be pre-filled next time and survive an undo → delete → rebuild.
   */
  last_charge_amount: number;
  last_charge_toll: boolean;
  last_charge_tax: boolean;
  last_charge_parking: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  company_id: string;
  number: string;
  type: CarType;
  ownership: Ownership;
  vendor_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  company_id: string;
  client_id: string;
  vehicle_id: string;
  date: string;
  end_date: string | null;
  car_type: CarType;
  mode: TripMode;
  /** For transfer / package modes, names the rate-card plan picked. */
  plan_name: string | null;
  billing_method: BillingMethod;
  total_kms: number;
  total_hours: number;
  night: boolean;
  night_count: number;
  driver_ta: number;
  toll: number;
  extra_charge_amount: number;
  charge_toll: boolean;
  charge_tax: boolean;
  charge_parking: boolean;
  notes: string | null;
  duty_slip_no: string | null;
  invoiced: boolean;
  invoice_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  company_id: string;
  number: string;
  client_id: string | null;
  client_name: string | null;
  client_address: string | null;
  client_gstin: string | null;
  client_contact: string | null;
  date: string;
  valid_until: string | null;
  status: QuotationStatus;
  notes: string | null;
  source_pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
}

export interface QuotationLine {
  id: string;
  quotation_id: string;
  car_type: CarType;
  mode: TripMode;
  base_rate: number | null;
  base_kms: number | null;
  base_hours: number | null;
  extra_km: number | null;
  extra_hour: number | null;
  night: number | null;
  per_km: number | null;
  driver_ta: number | null;
  plan_name: string | null;
  fixed_price: number | null;
  includes_toll: boolean;
  includes_tax: boolean;
  includes_parking: boolean;
  notes: string | null;
  sort_order: number;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: number;
  invoice_date: string;
  client_id: string | null;
  client_name: string;
  client_address: string | null;
  client_gstin: string | null;
  client_booked_by: string | null;
  period_from: string | null;
  period_to: string | null;
  subtotal: number;
  gst_mode: GstMode;
  cgst: number;
  sgst: number;
  igst: number;
  toll_total: number;
  toll_label: string | null;
  net_amount: number;
  amount_in_words: string;
  status: InvoiceStatus;
  paid_date: string | null;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  trip_id: string | null;
  date: string | null;
  vehicle_label: string | null;
  hsn_code: string | null;
  particulars: string | null;
  qty: number | null;
  rate: number | null;
  amount: number;
  sort_order: number;
}

export interface RateCard {
  id: string;
  company_id: string;
  client_id: string;
  car_type: CarType;
  mode: TripMode;
  // local-mode fields
  base_rate: number | null;
  base_kms: number | null;
  base_hours: number | null;
  extra_km: number | null;
  extra_hour: number | null;
  night: number | null;
  // outstation-mode field
  per_km: number | null;
  // transfer / package fixed-price fields
  plan_name: string | null;
  fixed_price: number | null;
  includes_toll: boolean;
  includes_tax: boolean;
  includes_parking: boolean;
  notes: string | null;
  // common
  driver_ta: number | null;
  source_quotation_id: string | null;
  active_from: string;
  created_at: string;
  updated_at: string;
}
