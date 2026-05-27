// Database type stub. We can later regenerate this with the Supabase CLI:
//   supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
// For now, a minimal shape that covers what we touch in early milestones.

export type Role = "owner" | "admin" | "staff" | "viewer";
export type GstMode = "RCM" | "CGST_SGST" | "IGST";
export type TripMode = "local" | "outstation";
export type CarType = "Dzire" | "Sonet" | "Crysta" | "Innova" | "Ertiga" | "Other";
export type Ownership = "own" | "attached";
export type QuotationStatus = "draft" | "sent" | "accepted" | "expired" | "rejected";
export type InvoiceStatus = "draft" | "unpaid" | "paid" | "reversed";

export interface Company {
  id: string;
  name: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  state: string;
  invoice_prefix: string | null;
  next_invoice_number: number;
  quotation_prefix: string | null;
  next_quotation_number: number;
  terms_invoice: string[] | null;
  terms_quotation: string[] | null;
  plan: "free" | "pro";
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
  default_booked_by: string | null;
  notes: string | null;
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
  // common
  driver_ta: number | null;
  source_quotation_id: string | null;
  active_from: string;
  created_at: string;
  updated_at: string;
}
