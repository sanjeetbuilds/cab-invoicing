import type { BillingMethod, CarType, TripMode } from "@/lib/supabase/types";

/**
 * One row in the bulk draft. All fields are strings (or booleans) so they
 * round-trip from the form to JSONB without losing partial input.
 *
 * Kept in a non-"use server" module because Next.js requires every export
 * from a "use server" file to be an async function.
 */
export interface BulkDraftRow {
  date: string;
  end_date: string;
  client_id: string;
  vehicle_id: string;
  car_type: "" | CarType;
  mode: "" | TripMode;
  billing_method: BillingMethod;
  total_kms: string;
  total_hours: string;
  night: boolean;
  driver_ta: string;
  extra_charge_amount: string;
  charge_toll: boolean;
  charge_tax: boolean;
  charge_parking: boolean;
  notes: string;
  duty_slip_no: string;
}

export function emptyDraftRow(): BulkDraftRow {
  return {
    date: "",
    end_date: "",
    client_id: "",
    vehicle_id: "",
    car_type: "",
    mode: "",
    billing_method: "per_km",
    total_kms: "",
    total_hours: "",
    night: false,
    driver_ta: "",
    extra_charge_amount: "",
    charge_toll: false,
    charge_tax: false,
    charge_parking: false,
    notes: "",
    duty_slip_no: "",
  };
}
