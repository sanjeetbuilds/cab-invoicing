import type {
  Client,
  Company,
  RateCard,
  Trip,
  Vehicle,
} from "@/lib/supabase/types";
import { tripToLines, tripTotal } from "@/lib/trip-lines";
import { gstFor, type GstResult } from "@/lib/gst";
import { numberToWords } from "@/lib/number-to-words";
import { chargeLabel, unionChargeFlags } from "@/lib/charges";

export interface InvoiceLineDraft {
  trip_id: string | null;
  date: string;          // display format, multi-line for multi-day duties
  vehicle_label: string; // e.g. "9083 Sonet"
  hsn_code: string;
  particulars: string;
  qty: number | null;
  rate: number | null;
  amount: number;
  sort_order: number;
}

export interface InvoiceDraft {
  lines: InvoiceLineDraft[];
  subtotal: number;
  gst: GstResult;
  toll_total: number;
  toll_label: string;
  net_amount: number;
  amount_in_words: string;
  /**
   * Trips that had no matching rate card. The caller should surface this
   * before letting the user issue the invoice.
   */
  unmatched_trip_ids: string[];
}

export interface BuildInvoiceInput {
  trips: Trip[];
  rateCards: RateCard[];
  vehicles: Pick<Vehicle, "id" | "number" | "type">[];
  client: Pick<Client, "id" | "state" | "is_rcm">;
  company: Pick<Company, "state">;
  /** Override the sum of trip extra charges with this value. */
  toll_override?: number | null;
}

export function buildInvoiceDraft(input: BuildInvoiceInput): InvoiceDraft {
  const rateByKey = new Map<string, RateCard>();
  for (const r of input.rateCards) {
    rateByKey.set(`${r.client_id}|${r.car_type}|${r.mode}`, r);
  }
  const vehicleById = new Map(input.vehicles.map((v) => [v.id, v]));

  const lines: InvoiceLineDraft[] = [];
  const unmatched: string[] = [];
  let sort_order = 0;

  // Local trips always use slab; outstation trips respect billing_method
  // (default 'per_km' from DB, or 'slab' when the user toggles).
  const effectiveMethod = (t: Trip): "slab" | "per_km" => {
    if (t.mode === "local") return "slab";
    return t.billing_method === "slab" ? "slab" : "per_km";
  };

  // Slab → look up the LOCAL rate card; per_km → outstation rate card.
  const resolveRate = (t: Trip): RateCard | undefined => {
    const lookupMode = effectiveMethod(t) === "slab" ? "local" : "outstation";
    return rateByKey.get(`${t.client_id}|${t.car_type}|${lookupMode}`);
  };

  const computeTripLines = (t: Trip, rate: RateCard) =>
    tripToLines(
      {
        car_type: t.car_type,
        mode: t.mode,
        billing_method: effectiveMethod(t),
        total_kms: t.total_kms,
        total_hours: t.total_hours,
        night: t.night,
        driver_ta: t.driver_ta,
      },
      rate,
    );

  for (const trip of input.trips) {
    const rate = resolveRate(trip);
    if (!rate) {
      unmatched.push(trip.id);
      continue;
    }
    const v = vehicleById.get(trip.vehicle_id);
    const vehicle_label = v
      ? `${lastSegment(v.number)} ${v.type}`
      : trip.car_type;
    const date = fmtTripDateRange(trip.date, trip.end_date);

    const tripLines = computeTripLines(trip, rate);

    for (const line of tripLines) {
      lines.push({
        trip_id: trip.id,
        date,
        vehicle_label,
        hsn_code: "996601",
        particulars: line.particulars,
        qty: line.qty,
        rate: line.rate,
        amount: line.amount,
        sort_order: sort_order++,
      });
    }
  }

  const matchedTrips = input.trips.filter((t) => !unmatched.includes(t.id));

  const subtotal = round2(
    matchedTrips.reduce((sum, trip) => {
      const rate = resolveRate(trip);
      if (!rate) return sum;
      return sum + tripTotal(computeTripLines(trip, rate));
    }, 0),
  );

  const gst = gstFor(input.client, subtotal, input.company);

  // Charges (toll / tax / parking) — single amount per trip, dynamic label.
  // Prefer the new extra_charge_amount; fall back to the legacy `toll`
  // column so trips logged before the schema change still total correctly.
  const tripChargeAmount = (t: Trip): number => {
    const v = t.extra_charge_amount ?? 0;
    if (v !== 0) return v;
    return t.toll ?? 0;
  };

  const summedCharges = matchedTrips.reduce(
    (sum, t) => sum + tripChargeAmount(t),
    0,
  );
  const toll_total = round2(
    input.toll_override != null ? input.toll_override : summedCharges,
  );

  const unionFlags = unionChargeFlags(
    matchedTrips.map((t) => ({
      toll: t.charge_toll ?? false,
      tax: t.charge_tax ?? false,
      parking: t.charge_parking ?? false,
    })),
  );
  const toll_label = chargeLabel(unionFlags, toll_total);

  const net_amount = round2(
    subtotal + gst.cgst + gst.sgst + gst.igst + toll_total,
  );

  const amount_in_words = `${numberToWords(Math.round(net_amount))} Only.`;

  return {
    lines,
    subtotal,
    gst,
    toll_total,
    toll_label,
    net_amount,
    amount_in_words,
    unmatched_trip_ids: unmatched,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function lastSegment(s: string): string {
  const parts = s.trim().split(/\s+/);
  return parts[parts.length - 1] ?? s;
}

/** Format a single date as D/M/YY, or a date range stacked over three lines. */
function fmtTripDateRange(
  startIso: string,
  endIso: string | null,
): string {
  const start = fmtTripDate(startIso);
  if (!endIso || endIso === startIso) return start;
  const end = fmtTripDate(endIso);
  return `${start}\nto\n${end}`;
}

/** "2026-04-15" → "15/4/26" (matches prototype invoice display). */
function fmtTripDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}
