import { describe, it, expect } from "vitest";
import { chargeLabel, unionChargeFlags } from "./charges";

describe("chargeLabel, single ticked box", () => {
  it("just Toll → 'Toll'", () => {
    expect(chargeLabel({ toll: true, tax: false, parking: false })).toBe("Toll");
  });
  it("just Tax → 'Tax'", () => {
    expect(chargeLabel({ toll: false, tax: true, parking: false })).toBe("Tax");
  });
  it("just Parking → 'Parking'", () => {
    expect(chargeLabel({ toll: false, tax: false, parking: true })).toBe("Parking");
  });
});

describe("chargeLabel, two ticked boxes", () => {
  it("Toll + Parking → 'Toll & Parking'", () => {
    expect(chargeLabel({ toll: true, tax: false, parking: true })).toBe(
      "Toll & Parking",
    );
  });
  it("Toll + Tax → 'Toll & Tax' (real Bharti 2119 / Paras 2117)", () => {
    expect(chargeLabel({ toll: true, tax: true, parking: false })).toBe(
      "Toll & Tax",
    );
  });
  it("Tax + Parking → 'Tax & Parking'", () => {
    expect(chargeLabel({ toll: false, tax: true, parking: true })).toBe(
      "Tax & Parking",
    );
  });
});

describe("chargeLabel, all three ticked", () => {
  it("Toll + Tax + Parking → 'Toll, Tax & Parking'", () => {
    expect(chargeLabel({ toll: true, tax: true, parking: true })).toBe(
      "Toll, Tax & Parking",
    );
  });
});

describe("chargeLabel, order is fixed Toll → Tax → Parking", () => {
  it("regardless of which boxes are ticked, order stays the same", () => {
    expect(chargeLabel({ toll: false, tax: true, parking: true })).toBe(
      "Tax & Parking",
    );
    expect(chargeLabel({ toll: true, tax: false, parking: true })).toBe(
      "Toll & Parking",
    );
  });
});

describe("chargeLabel, empty fallback", () => {
  it("no boxes ticked, amount > 0 → fallback 'Toll & Parking'", () => {
    expect(
      chargeLabel({ toll: false, tax: false, parking: false }, 500),
    ).toBe("Toll & Parking");
  });
  it("no boxes ticked, amount = 0 → still returns a label for safety", () => {
    expect(
      chargeLabel({ toll: false, tax: false, parking: false }),
    ).toBe("Toll & Parking");
  });
});

describe("unionChargeFlags", () => {
  it("ORs flags across multiple trips", () => {
    const u = unionChargeFlags([
      { toll: true, tax: false, parking: false },
      { toll: false, tax: true, parking: false },
      { toll: false, tax: false, parking: true },
    ]);
    expect(u).toEqual({ toll: true, tax: true, parking: true });
  });

  it("empty input → all false", () => {
    expect(unionChargeFlags([])).toEqual({
      toll: false,
      tax: false,
      parking: false,
    });
  });

  it("two trips with overlapping flags", () => {
    const u = unionChargeFlags([
      { toll: true, tax: true, parking: false },
      { toll: true, tax: false, parking: false },
    ]);
    expect(u).toEqual({ toll: true, tax: true, parking: false });
  });
});
