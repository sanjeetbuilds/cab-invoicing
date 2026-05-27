import type { RateCard, TripMode } from "@/lib/supabase/types";

/**
 * The minimum trip shape required to compute lines.
 * Decoupled from the DB row so tests don't need full DB inserts.
 */
export interface ComputableTrip {
  car_type: string;
  mode: TripMode;
  total_kms: number;
  total_hours: number;
  night: boolean;
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

  if (trip.mode === "local") {
    const base_rate  = rate.base_rate  ?? 0;
    const base_kms   = rate.base_kms   ?? 0;
    const base_hours = rate.base_hours ?? 0;
    const extra_km   = rate.extra_km   ?? 0;
    const extra_hour = rate.extra_hour ?? 0;
    const night_fee  = rate.night      ?? 0;

    const overKms   = trip.total_kms   > base_kms;
    const overHours = trip.total_hours > base_hours;

    lines.push({
      particulars: overKms
        ? `Total ${trip.total_kms}kms\n${base_kms}kms/${base_hours}hrs`
        : `${base_kms}kms/${base_hours}hrs`,
      qty: null,
      rate: null,
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

    if (trip.night) {
      lines.push({
        particulars: "Night Charges",
        qty: null,
        rate: null,
        amount: round2(night_fee),
      });
    }
  } else {
    // outstation
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
