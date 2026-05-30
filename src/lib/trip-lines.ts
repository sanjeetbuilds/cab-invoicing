import type { BillingMethod, RateCard, TripMode } from "@/lib/supabase/types";

/**
 * The minimum trip shape required to compute lines.
 * Decoupled from the DB row so tests don't need full DB inserts.
 *
 * The mode dispatches the line shape:
 *   - local                         → slab: base + additional kms + hrs + night
 *   - outstation w/ billing_method='per_km' → total_kms × per_km
 *   - outstation w/ billing_method='slab'   → slab (borrows local rate)
 *   - transfer / package            → fixed_price as a single line
 * Driver's TA is appended in every branch.
 */
export interface ComputableTrip {
  car_type: string;
  mode: TripMode;
  billing_method: BillingMethod;
  total_kms: number;
  total_hours: number;
  /** Backwards-compat boolean; treated as 1 night when night_count is 0. */
  night: boolean;
  night_count: number; // number of nights
  driver_ta: number; // count of days
}

/**
 * A line as it will appear on the invoice. `amount` is always concrete.
 * `qty` and `rate` are only set when the line is "qty × rate"; flat-fee
 * lines (base, night) leave them null.
 */
export interface TripLine {
  particulars: string;
  qty: number | null;
  rate: number | null;
  amount: number;
}

/**
 * Pure computation. Matches the prototype's formula exactly. The four
 * reference invoices in BUILD-SPEC.md are pinned in trip-lines.test.ts.
 */
export function tripToLines(trip: ComputableTrip, rate: RateCard): TripLine[] {
  const lines: TripLine[] = [];

  // Transfer + Package: single fixed-price line. Plan name lives on the
  // rate card so the invoice particulars read "Airport T3 Drop" /
  // "Manali 3D2N package" — the renderer pulls plan_name when present.
  if (trip.mode === "transfer" || trip.mode === "package") {
    const fixed = rate.fixed_price ?? 0;
    const planLabel = rate.plan_name?.trim() || (trip.mode === "transfer" ? "Transfer" : "Package");
    lines.push({
      particulars: trip.mode === "package" ? `${planLabel} package` : planLabel,
      qty: null,
      rate: null,
      amount: round2(fixed),
    });
    if (trip.driver_ta > 0) {
      const driver_ta_rate = rate.driver_ta ?? 0;
      lines.push({
        particulars: "Driver's TA",
        qty: trip.driver_ta,
        rate: driver_ta_rate,
        amount: round2(trip.driver_ta * driver_ta_rate),
      });
    }
    return lines;
  }

  if (trip.billing_method === "slab") {
    const base_rate  = rate.base_rate  ?? 0;
    const base_kms   = rate.base_kms   ?? 0;
    const base_hours = rate.base_hours ?? 0;
    const extra_km   = rate.extra_km   ?? 0;
    const extra_hour = rate.extra_hour ?? 0;
    const night_fee  = rate.night      ?? 0;

    const overKms   = trip.total_kms   > base_kms;
    const overHours = trip.total_hours > base_hours;

    // When the duty went over the base kms, emit a context-only "Total Nkms"
    // line above the base slab line. The slab line carries the base rate and
    // amount so the Rate / Amount columns visually align with "Nkms/Nhrs",
    // matching the real Krishna Cabs invoice format.
    if (overKms) {
      lines.push({
        particulars: `Total ${trip.total_kms}kms`,
        qty: null,
        rate: null,
        amount: 0,
      });
    }
    lines.push({
      particulars: `${base_kms}kms/${base_hours}hrs`,
      qty: null,
      rate: base_rate,
      amount: round2(base_rate),
    });

    if (overKms) {
      const qty = trip.total_kms - base_kms;
      lines.push({
        particulars: "Additional kms",
        qty,
        rate: extra_km,
        amount: round2(qty * extra_km),
      });
    }

    if (overHours) {
      const qty = trip.total_hours - base_hours;
      lines.push({
        particulars: "Additional hrs",
        qty,
        rate: extra_hour,
        amount: round2(qty * extra_hour),
      });
    }

    const nights = trip.night_count > 0
      ? trip.night_count
      : (trip.night ? 1 : 0);
    if (nights > 0) {
      lines.push({
        particulars: "Night Charges",
        qty: nights,
        rate: night_fee,
        amount: round2(nights * night_fee),
      });
    }
  } else {
    // per_km billing (the default for outstation)
    const per_km = rate.per_km ?? 0;
    lines.push({
      particulars: `Total kms ${trip.total_kms}`,
      qty: trip.total_kms,
      rate: per_km,
      amount: round2(trip.total_kms * per_km),
    });
  }

  if (trip.driver_ta > 0) {
    const driver_ta_rate = rate.driver_ta ?? 0;
    lines.push({
      particulars: "Driver's TA",
      qty: trip.driver_ta,
      rate: driver_ta_rate,
      amount: round2(trip.driver_ta * driver_ta_rate),
    });
  }

  return lines;
}

export function tripTotal(lines: TripLine[]): number {
  return round2(lines.reduce((s, l) => s + l.amount, 0));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
