import { describe, it, expect } from "vitest";
import { tripToLines, tripTotal, type ComputableTrip } from "./trip-lines";
import type { RateCard } from "@/lib/supabase/types";

/** Shorthand: defaults billing_method from mode (local→slab, outstation→per_km). */
function ct(
  fields: Omit<ComputableTrip, "billing_method"> & {
    billing_method?: ComputableTrip["billing_method"];
  },
): ComputableTrip {
  return {
    ...fields,
    billing_method:
      fields.billing_method ?? (fields.mode === "local" ? "slab" : "per_km"),
  };
}

// Minimal rate-card factory. Only the rate fields matter for the math;
// everything else is dummy.
function rate(overrides: Partial<RateCard>): RateCard {
  return {
    id: "test",
    company_id: "test",
    client_id: "test",
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
    ...overrides,
  };
}

describe("tripToLines — reference invoices from BUILD-SPEC.md", () => {
  it("FHPL 17-Apr Sonet local 149km / 9.5hr / night → ₹2,985", () => {
    const r = rate({
      mode: "local",
      base_rate: 1500,
      base_kms: 80,
      base_hours: 8,
      extra_km: 15,
      extra_hour: 100,
      night: 300,
      driver_ta: 300,
    });
    const lines = tripToLines(
      ct({
        car_type: "Sonet",
        mode: "local",
        total_kms: 149,
        total_hours: 9.5,
        night: true,
        driver_ta: 0,
      }),
      r,
    );
    expect(lines).toEqual([
      { particulars: "Total 149kms\n80kms/8hrs", qty: null, rate: null, amount: 1500 },
      { particulars: "Additional kms",            qty: 69,   rate: 15,   amount: 1035 },
      { particulars: "Additional hrs",            qty: 1.5,  rate: 100,  amount: 150 },
      { particulars: "Night Charges",             qty: null, rate: null, amount: 300 },
    ]);
    expect(tripTotal(lines)).toBe(2985);
  });

  it("Paras 15-16 Apr Sonet outstation 707km / 2 TA → ₹11,205", () => {
    const r = rate({
      mode: "outstation",
      per_km: 15,
      driver_ta: 300,
    });
    const lines = tripToLines(
      ct({
        car_type: "Sonet",
        mode: "outstation",
        total_kms: 707,
        total_hours: 0,
        night: false,
        driver_ta: 2,
      }),
      r,
    );
    expect(lines).toEqual([
      { particulars: "Total kms 707", qty: 707, rate: 15,  amount: 10605 },
      { particulars: "Driver's TA",   qty: 2,   rate: 300, amount: 600 },
    ]);
    expect(tripTotal(lines)).toBe(11205);
  });

  it("Bharti 22-Apr Dzire outstation 474km / 1 TA → ₹6,936", () => {
    const r = rate({
      mode: "outstation",
      per_km: 14,
      driver_ta: 300,
    });
    const lines = tripToLines(
      ct({
        car_type: "Dzire",
        mode: "outstation",
        total_kms: 474,
        total_hours: 0,
        night: false,
        driver_ta: 1,
      }),
      r,
    );
    expect(lines).toEqual([
      { particulars: "Total kms 474", qty: 474, rate: 14,  amount: 6636 },
      { particulars: "Driver's TA",   qty: 1,   rate: 300, amount: 300 },
    ]);
    expect(tripTotal(lines)).toBe(6936);
  });

  it("Metalman 14-Apr Sonet local 159km / 13hr → ₹3,614", () => {
    const r = rate({
      mode: "local",
      base_rate: 1600,
      base_kms: 80,
      base_hours: 8,
      extra_km: 16,
      extra_hour: 150,
      night: 300,
      driver_ta: 300,
    });
    const lines = tripToLines(
      ct({
        car_type: "Sonet",
        mode: "local",
        total_kms: 159,
        total_hours: 13,
        night: false,
        driver_ta: 0,
      }),
      r,
    );
    expect(lines).toEqual([
      { particulars: "Total 159kms\n80kms/8hrs", qty: null, rate: null, amount: 1600 },
      { particulars: "Additional kms",            qty: 79,   rate: 16,   amount: 1264 },
      { particulars: "Additional hrs",            qty: 5,    rate: 150,  amount: 750 },
    ]);
    expect(tripTotal(lines)).toBe(3614);
  });
});

describe("tripToLines — outstation billed as slab borrows the local rate card", () => {
  it("an outstation trip with billing_method='slab' renders local-style lines", () => {
    // Same 149km/9.5hr/night trip as the FHPL case, but mode='outstation'
    // with the slab override. Output must match the local equivalent.
    const r = rate({
      mode: "local",
      base_rate: 1500,
      base_kms: 80,
      base_hours: 8,
      extra_km: 15,
      extra_hour: 100,
      night: 300,
      driver_ta: 300,
    });
    const lines = tripToLines(
      {
        car_type: "Sonet",
        mode: "outstation",
        billing_method: "slab",
        total_kms: 149,
        total_hours: 9.5,
        night: true,
        driver_ta: 0,
      },
      r,
    );
    expect(lines).toEqual([
      { particulars: "Total 149kms\n80kms/8hrs", qty: null, rate: null, amount: 1500 },
      { particulars: "Additional kms",            qty: 69,   rate: 15,   amount: 1035 },
      { particulars: "Additional hrs",            qty: 1.5,  rate: 100,  amount: 150 },
      { particulars: "Night Charges",             qty: null, rate: null, amount: 300 },
    ]);
    expect(tripTotal(lines)).toBe(2985);
  });

  it("same outstation trip with billing_method='per_km' uses per_km logic", () => {
    const r = rate({
      mode: "outstation",
      per_km: 15,
      driver_ta: 300,
    });
    const lines = tripToLines(
      {
        car_type: "Sonet",
        mode: "outstation",
        billing_method: "per_km",
        total_kms: 149,
        total_hours: 0,
        night: false,
        driver_ta: 0,
      },
      r,
    );
    expect(lines).toEqual([
      { particulars: "Total kms 149", qty: 149, rate: 15, amount: 2235 },
    ]);
    expect(tripTotal(lines)).toBe(2235);
  });
});

describe("tripToLines — edge cases", () => {
  it("local trip exactly at base kms/hours, no night, no TA: just the base line", () => {
    const r = rate({
      mode: "local",
      base_rate: 1500,
      base_kms: 80,
      base_hours: 8,
      extra_km: 15,
      extra_hour: 100,
      night: 300,
    });
    const lines = tripToLines(
      ct({
        car_type: "Sonet",
        mode: "local",
        total_kms: 80,
        total_hours: 8,
        night: false,
        driver_ta: 0,
      }),
      r,
    );
    expect(lines).toEqual([
      { particulars: "80kms/8hrs", qty: null, rate: null, amount: 1500 },
    ]);
    expect(tripTotal(lines)).toBe(1500);
  });

  it("returns Driver's TA on a local trip too", () => {
    const r = rate({
      mode: "local",
      base_rate: 1500,
      base_kms: 80,
      base_hours: 8,
      extra_km: 15,
      extra_hour: 100,
      night: 300,
      driver_ta: 300,
    });
    const lines = tripToLines(
      ct({
        car_type: "Sonet",
        mode: "local",
        total_kms: 80,
        total_hours: 8,
        night: false,
        driver_ta: 3,
      }),
      r,
    );
    expect(lines[lines.length - 1]).toEqual({
      particulars: "Driver's TA",
      qty: 3,
      rate: 300,
      amount: 900,
    });
  });
});
