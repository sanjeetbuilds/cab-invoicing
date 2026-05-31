import { describe, it, expect } from "vitest";
import { buildInvoiceDraft } from "./invoice-builder";
import type {
  Client,
  Company,
  RateCard,
  Trip,
  Vehicle,
} from "@/lib/supabase/types";

const company: Pick<Company, "state"> = { state: "Haryana" };

const haryanaClient: Pick<Client, "id" | "state" | "is_rcm"> = {
  id: "client-haryana",
  state: "Haryana",
  is_rcm: false,
};

const delhiClient: Pick<Client, "id" | "state" | "is_rcm"> = {
  id: "client-delhi",
  state: "Delhi",
  is_rcm: false,
};

const rcmClient: Pick<Client, "id" | "state" | "is_rcm"> = {
  id: "client-rcm",
  state: "Delhi",
  is_rcm: true,
};

const vehicle: Pick<Vehicle, "id" | "number" | "type"> = {
  id: "v1",
  number: "HR 26 ED 9083",
  type: "Sonet",
};

function rate(o: Partial<RateCard>): RateCard {
  return {
    id: "r",
    company_id: "c",
    client_id: "client",
    car_type: "Sonet",
    mode: "local",
    base_rate: null,
    base_kms: null,
    base_hours: null,
    extra_km: null,
    extra_hour: null,
    night: null,
    per_km: null,
    driver_ta: null,
    source_quotation_id: null,
    active_from: "2026-01-01",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...o,
  };
}

function trip(o: Partial<Trip>): Trip {
  const merged: Trip = {
    id: "t",
    company_id: "c",
    client_id: "client",
    vehicle_id: vehicle.id,
    date: "2026-04-15",
    end_date: null,
    car_type: "Sonet",
    mode: "local",
    plan_name: null,
    billing_method: "slab",
    total_kms: 0,
    total_hours: 0,
    night: false,
    night_count: 0,
    driver_ta: 0,
    toll: 0,
    extra_charge_amount: 0,
    charge_toll: false,
    charge_tax: false,
    charge_parking: false,
    notes: null,
    duty_slip_no: null,
    invoiced: false,
    invoice_id: null,
    created_by: null,
    created_at: "2026-04-15",
    updated_at: "2026-04-15",
    ...o,
  };
  // Default billing_method from mode unless caller set it explicitly.
  if (o.billing_method === undefined) {
    merged.billing_method = merged.mode === "local" ? "slab" : "per_km";
  }
  return merged;
}

describe("buildInvoiceDraft", () => {
  it("single FHPL trip, same state → CGST + SGST", () => {
    const trips = [
      trip({
        id: "trip-1",
        client_id: haryanaClient.id,
        total_kms: 149,
        total_hours: 9.5,
        night: true,
      }),
    ];
    const rateCards = [
      rate({
        client_id: haryanaClient.id,
        base_rate: 1500,
        base_kms: 80,
        base_hours: 8,
        extra_km: 15,
        extra_hour: 100,
        night: 300,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: haryanaClient,
      company,
    });

    expect(draft.subtotal).toBe(2985);
    expect(draft.gst.mode).toBe("CGST_SGST");
    expect(draft.gst.cgst).toBe(74.63);
    expect(draft.gst.sgst).toBe(74.63);
    expect(draft.toll_total).toBe(0);
    expect(draft.net_amount).toBe(3134.26);
    expect(draft.unmatched_trip_ids).toEqual([]);
    expect(draft.lines).toHaveLength(5);
    expect(draft.lines[0].date).toBe("15/4/26");
    expect(draft.lines[0].vehicle_label).toBe("9083 Sonet");
    expect(draft.lines[0].hsn_code).toBe("996601");
  });

  it("inter-state client → IGST 5%, no CGST/SGST", () => {
    const trips = [
      trip({
        id: "trip-2",
        client_id: delhiClient.id,
        mode: "outstation",
        total_kms: 707,
        driver_ta: 2,
      }),
    ];
    const rateCards = [
      rate({
        client_id: delhiClient.id,
        mode: "outstation",
        per_km: 15,
        driver_ta: 300,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: delhiClient,
      company,
    });

    expect(draft.subtotal).toBe(11205);
    expect(draft.gst.mode).toBe("IGST");
    expect(draft.gst.igst).toBe(560.25);
    expect(draft.gst.cgst).toBe(0);
    expect(draft.net_amount).toBe(11765.25);
  });

  it("RCM client → zero GST regardless of state", () => {
    const trips = [
      trip({
        id: "trip-3",
        client_id: rcmClient.id,
        mode: "outstation",
        total_kms: 474,
        driver_ta: 1,
      }),
    ];
    const rateCards = [
      rate({
        client_id: rcmClient.id,
        mode: "outstation",
        per_km: 14,
        driver_ta: 300,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: rcmClient,
      company,
    });

    expect(draft.subtotal).toBe(6936);
    expect(draft.gst.mode).toBe("RCM");
    expect(draft.gst.igst).toBe(0);
    expect(draft.gst.cgst).toBe(0);
    expect(draft.gst.sgst).toBe(0);
    expect(draft.net_amount).toBe(6936);
  });

  it("toll override beats trip extra-charge sums", () => {
    const trips = [
      trip({
        id: "a",
        client_id: haryanaClient.id,
        total_kms: 80,
        total_hours: 8,
        extra_charge_amount: 100,
        charge_toll: true,
      }),
      trip({
        id: "b",
        client_id: haryanaClient.id,
        total_kms: 80,
        total_hours: 8,
        extra_charge_amount: 50,
        charge_toll: true,
      }),
    ];
    const rateCards = [
      rate({
        client_id: haryanaClient.id,
        base_rate: 1500,
        base_kms: 80,
        base_hours: 8,
      }),
    ];

    const sumDraft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: haryanaClient,
      company,
    });
    expect(sumDraft.toll_total).toBe(150);

    const overrideDraft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: haryanaClient,
      company,
      toll_override: 999,
    });
    expect(overrideDraft.toll_total).toBe(999);
  });

  it("trips without a matching rate card are flagged, not silently dropped from awareness", () => {
    const trips = [
      trip({ id: "good", client_id: haryanaClient.id, total_kms: 80, total_hours: 8 }),
      trip({ id: "bad",  client_id: haryanaClient.id, total_kms: 80, total_hours: 8, car_type: "Crysta" }),
    ];
    const rateCards = [
      rate({
        client_id: haryanaClient.id,
        base_rate: 1500,
        base_kms: 80,
        base_hours: 8,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: haryanaClient,
      company,
    });

    expect(draft.unmatched_trip_ids).toEqual(["bad"]);
    expect(draft.subtotal).toBe(1500);
  });

  it("multi-day outstation trip renders stacked date in line cell", () => {
    const trips = [
      trip({
        id: "paras-multi-day",
        client_id: haryanaClient.id,
        mode: "outstation",
        date: "2026-04-15",
        end_date: "2026-04-16",
        total_kms: 707,
        driver_ta: 2,
      }),
      trip({
        id: "paras-single-day",
        client_id: haryanaClient.id,
        mode: "outstation",
        date: "2026-04-22",
        end_date: null,
        total_kms: 100,
      }),
    ];
    const rateCards = [
      rate({
        client_id: haryanaClient.id,
        mode: "outstation",
        per_km: 15,
        driver_ta: 300,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: haryanaClient,
      company,
    });
    // Multi-day trip: both of its lines carry the stacked date.
    expect(draft.lines[0].date).toBe("15/4/26\nto\n16/4/26");
    expect(draft.lines[1].date).toBe("15/4/26\nto\n16/4/26");
    // Single-day trip: plain one-line date.
    expect(draft.lines[2].date).toBe("22/4/26");
  });

  it("toll_label reflects union of ticked boxes across selected trips", () => {
    const trips = [
      trip({
        id: "a",
        client_id: haryanaClient.id,
        total_kms: 80,
        total_hours: 8,
        extra_charge_amount: 100,
        charge_toll: true,
        charge_tax: true,
      }),
      trip({
        id: "b",
        client_id: haryanaClient.id,
        total_kms: 80,
        total_hours: 8,
        extra_charge_amount: 50,
        charge_parking: true,
      }),
    ];
    const rateCards = [
      rate({
        client_id: haryanaClient.id,
        base_rate: 1500,
        base_kms: 80,
        base_hours: 8,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: haryanaClient,
      company,
    });
    expect(draft.toll_total).toBe(150);
    expect(draft.toll_label).toBe("Toll, Tax & Parking");
  });

  it("falls back to legacy `toll` column when extra_charge_amount is 0", () => {
    const trips = [
      trip({
        id: "legacy",
        client_id: haryanaClient.id,
        total_kms: 80,
        total_hours: 8,
        toll: 75,
        extra_charge_amount: 0,
      }),
    ];
    const rateCards = [
      rate({
        client_id: haryanaClient.id,
        base_rate: 1500,
        base_kms: 80,
        base_hours: 8,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: haryanaClient,
      company,
    });
    expect(draft.toll_total).toBe(75);
    // No flags ticked → fallback label
    expect(draft.toll_label).toBe("Toll & Parking");
  });

  it("outstation trip with billing_method='slab' looks up the LOCAL rate card", () => {
    // Same input as FHPL 149km/9.5hr/night but logged as outstation+slab.
    // Must match the local-billing total (₹2,985 subtotal, ₹2,985 RCM net).
    const trips = [
      trip({
        id: "outstation-slab",
        client_id: rcmClient.id,
        mode: "outstation",
        billing_method: "slab",
        total_kms: 149,
        total_hours: 9.5,
        night: true,
      }),
    ];
    const rateCards = [
      // Local rate card for the same car_type, slab logic reads from here.
      rate({
        client_id: rcmClient.id,
        mode: "local",
        base_rate: 1500,
        base_kms: 80,
        base_hours: 8,
        extra_km: 15,
        extra_hour: 100,
        night: 300,
      }),
      // An outstation rate card also exists, it must be ignored when slab.
      rate({
        client_id: rcmClient.id,
        mode: "outstation",
        per_km: 99,  // deliberately wrong; would produce a different total
        driver_ta: 300,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: rcmClient,
      company,
    });

    expect(draft.subtotal).toBe(2985);
    expect(draft.unmatched_trip_ids).toEqual([]);
    expect(draft.lines.map((l) => l.particulars)).toEqual([
      "Total 149kms",
      "80kms/8hrs",
      "Additional kms",
      "Additional hrs",
      "Night Charges",
    ]);
  });

  it("outstation+slab flags trip as unmatched when no LOCAL rate card exists", () => {
    const trips = [
      trip({
        id: "no-local-rate",
        client_id: rcmClient.id,
        mode: "outstation",
        billing_method: "slab",
        total_kms: 100,
      }),
    ];
    const rateCards = [
      // Only outstation rate card exists.
      rate({
        client_id: rcmClient.id,
        mode: "outstation",
        per_km: 15,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: rcmClient,
      company,
    });
    expect(draft.unmatched_trip_ids).toEqual(["no-local-rate"]);
    expect(draft.subtotal).toBe(0);
  });

  it("amount in words ends with ' Rupees Only'", () => {
    const trips = [
      trip({ id: "x", client_id: rcmClient.id, mode: "outstation", total_kms: 100 }),
    ];
    const rateCards = [
      rate({ client_id: rcmClient.id, mode: "outstation", per_km: 58 }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: rcmClient,
      company,
    });

    expect(draft.net_amount).toBe(5800);
    expect(draft.amount_in_words).toBe("Five Thousand Eight Hundred Only.");
  });

  it("mixed-mode invoice: one Local + one Transfer duty in the same bill", () => {
    // Both for the same Haryana client + Sonet vehicle.
    const trips = [
      trip({
        id: "local-1",
        client_id: haryanaClient.id,
        date: "2026-05-10",
        mode: "local",
        total_kms: 149,
        total_hours: 9.5,
        night_count: 1,
      }),
      trip({
        id: "transfer-1",
        client_id: haryanaClient.id,
        date: "2026-05-12",
        mode: "transfer",
        plan_name: "Airport T3 Drop",
        total_kms: 0,
        total_hours: 0,
      }),
    ];
    const rateCards = [
      rate({
        client_id: haryanaClient.id,
        car_type: "Sonet",
        mode: "local",
        base_rate: 1500,
        base_kms: 80,
        base_hours: 8,
        extra_km: 15,
        extra_hour: 100,
        night: 300,
      }),
      rate({
        id: "r-transfer",
        client_id: haryanaClient.id,
        car_type: "Sonet",
        mode: "transfer",
        plan_name: "Airport T3 Drop",
        fixed_price: 1500,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [vehicle],
      client: haryanaClient,
      company,
    });

    // Local: 1500 + 1035 (69 extra km @ 15) + 150 (1.5 extra hr @ 100) + 300 night = 2985
    // Transfer: 1500 fixed
    // Subtotal: 4485
    expect(draft.unmatched_trip_ids).toEqual([]);
    expect(draft.subtotal).toBe(4485);

    // The transfer line on the invoice reads "Airport T3 Drop", not
    // the slab-style "80kms/8hrs" particulars.
    const transferLines = draft.lines.filter((l) => l.trip_id === "transfer-1");
    expect(transferLines).toHaveLength(1);
    expect(transferLines[0].particulars).toBe("Airport T3 Drop");
    expect(transferLines[0].amount).toBe(1500);

    // Local lines look like a normal slab invoice.
    const localLines = draft.lines.filter((l) => l.trip_id === "local-1");
    expect(localLines.map((l) => l.particulars)).toEqual([
      "Total 149kms",
      "80kms/8hrs",
      "Additional kms",
      "Additional hrs",
      "Night Charges",
    ]);
  });

  it("car-type override: vehicle is a Sonet, trip is billed as a Dzire", () => {
    // Vehicle 9083 is master-typed as Sonet, but this trip's car_type is
    // Dzire, we look up the Dzire rate AND the invoice label reads
    // "9083 Dzire" (not "9083 Sonet").
    const sonetVehicle: Pick<Vehicle, "id" | "number" | "type"> = {
      id: "v-sonet",
      number: "HR 26 ED 9083",
      type: "Sonet",
    };
    const trips = [
      trip({
        id: "override",
        client_id: haryanaClient.id,
        vehicle_id: sonetVehicle.id,
        car_type: "Dzire", // ← the override
        total_kms: 80,
        total_hours: 8,
      }),
    ];
    const rateCards = [
      // Only a Dzire rate exists; if the builder used vehicle.type (Sonet)
      // for lookup it would mark the trip unmatched.
      rate({
        client_id: haryanaClient.id,
        car_type: "Dzire",
        mode: "local",
        base_rate: 1200,
        base_kms: 80,
        base_hours: 8,
      }),
    ];

    const draft = buildInvoiceDraft({
      trips,
      rateCards,
      vehicles: [sonetVehicle],
      client: haryanaClient,
      company,
    });

    expect(draft.unmatched_trip_ids).toEqual([]);
    expect(draft.subtotal).toBe(1200);
    expect(draft.lines[0].vehicle_label).toBe("9083 Dzire");
  });
});
