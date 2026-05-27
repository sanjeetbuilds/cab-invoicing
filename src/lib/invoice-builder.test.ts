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
  return {
    id: "t",
    company_id: "c",
    client_id: "client",
    vehicle_id: vehicle.id,
    date: "2026-04-15",
    car_type: "Sonet",
    mode: "local",
    total_kms: 0,
    total_hours: 0,
    night: false,
    driver_ta: 0,
    toll: 0,
    notes: null,
    duty_slip_no: null,
    invoiced: false,
    invoice_id: null,
    created_by: null,
    created_at: "2026-04-15",
    updated_at: "2026-04-15",
    ...o,
  };
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
    expect(draft.lines).toHaveLength(4);
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

  it("toll override beats trip toll sums", () => {
    const trips = [
      trip({ id: "a", client_id: haryanaClient.id, total_kms: 80, total_hours: 8, toll: 100 }),
      trip({ id: "b", client_id: haryanaClient.id, total_kms: 80, total_hours: 8, toll: 50 }),
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
    expect(draft.amount_in_words).toBe("Five Thousand Eight Hundred Rupees Only");
  });
});
