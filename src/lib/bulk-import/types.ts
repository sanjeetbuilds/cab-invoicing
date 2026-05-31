/**
 * Shared types for the bulk-import flow. The server parses an uploaded
 * Excel/CSV into these neutral structures, runs validation + auto-fixes,
 * and hands the preview back to the client.
 */

import type { CarType, TripMode, Ownership } from "@/lib/supabase/types";

export interface ImportClientRow {
  name: string;
  gstin: string | null;
  state: string;
  address: string | null;
  default_booked_by: string | null;
  is_rcm: boolean;
  notes: string | null;
}

export interface ImportVehicleRow {
  number: string;
  type: CarType;
  ownership: Ownership;
  vendor_name: string | null;
  active: boolean;
}

export interface ImportRateCardRow {
  client_name: string;
  car_type: CarType;
  mode: TripMode;
  plan_name: string | null;
  base_rate: number | null;
  base_kms: number | null;
  base_hours: number | null;
  extra_km: number | null;
  extra_hour: number | null;
  night: number | null;
  per_km: number | null;
  fixed_price: number | null;
  driver_ta: number | null;
  notes: string | null;
}

/** A single row's preview entry, either ready to import or flagged. */
export interface PreviewRow<T> {
  /** 1-based row number in the source sheet, what Excel shows. */
  sheetRow: number;
  /** The parsed row (or partial, when validation failed). */
  data: T;
  /** Silent corrections we applied (state casing, vehicle number fmt). */
  fixes: string[];
  /**
   * Non-empty when the row can't be imported as-is. Each entry is a
   * user-readable sentence; the UI lists them under the row.
   */
  errors: string[];
  /** Optional DB-aware hints surfaced for rate-card rows. */
  meta?: {
    /** A matching rate card already exists, this row will overwrite it. */
    willUpdate?: boolean;
    /** Client name only appears in this upload's Clients sheet (not in DB yet). */
    clientIsNew?: boolean;
  };
}

export interface ParsedWorkbook {
  clients: PreviewRow<ImportClientRow>[];
  vehicles: PreviewRow<ImportVehicleRow>[];
  rateCards: PreviewRow<ImportRateCardRow>[];
  /** Top-level errors (wrong file shape, missing required sheet, etc). */
  topErrors: string[];
}

export type ImportEntity = "clients" | "vehicles" | "rate_cards" | "all";
