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

export interface InvoiceLineDraft {
  trip_id: string | null;
  date: string;          // display format, e.g. "15/4/26"
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
  /** Override the sum of trip tolls with this value. */
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

  for (const trip of input.trips) {
    const rate = rateByKey.get(
      `${trip.client_id}|${trip.car_type}|${trip.mode}`,
    );
    if (!rate) {
      unmatched.push(trip.id);
      continue;
    }
    const v = vehicleById.get(trip.vehicle_id);
    const vehicle_label = v
      ? `${lastSegment(v.number)} ${v.type}`
      : trip.car_type;
    const date = fmtTripDate(trip.date);

    const tripLines = tripToLines(
      {
        car_type: trip.car_type,
        mode: trip.mode,
        total_kms: trip.total_kms,
        total_hours: trip.total_hours,
        night: trip.night,
        driver_ta: trip.driver_ta,
      },
      rate,
    );

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

  const subtotal = round2(
    input.trips
      .filter((t) => !unmatched.includes(t.id))
      .reduce((sum, trip) => {
        const rate = rateByKey.get(
          `${trip.client_id}|${trip.car_type}|${trip.mode}`,
        );
        if (!rate) return sum;
        return sum + tripTotal(tripToLines(
          {
            car_type: trip.car_type,
            mode: trip.mode,
            total_kms: trip.total_kms,
            total_hours: trip.total_hours,
            night: trip.night,
            driver_ta: trip.driver_ta,
          },
          rate,
        ));
      }, 0),
  );

  const gst = gstFor(input.client, subtotal, input.company);

  const toll_total = round2(
    input.toll_override != null
      ? input.toll_override
      : input.trips.reduce((sum, t) => sum + (t.toll ?? 0), 0),
  );

  const net_amount = round2(
    subtotal + gst.cgst + gst.sgst + gst.igst + toll_total,
  );

  const amount_in_words = `${numberToWords(Math.round(net_amount))} Rupees Only`;

  return {
    lines,
    subtotal,
    gst,
    toll_total,
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

/** "2026-04-15" → "15/4/26" (matches prototype invoice display). */
function fmtTripDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}
