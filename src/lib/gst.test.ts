import { describe, it, expect } from "vitest";
import { gstFor } from "./gst";

const haryanaCompany = { state: "Haryana" };

describe("gstFor", () => {
  it("is_rcm client → RCM mode, all zeros, RCM labels", () => {
    const r = gstFor(
      { state: "Delhi", is_rcm: true },
      10000,
      haryanaCompany,
    );
    expect(r.mode).toBe("RCM");
    expect(r.cgst).toBe(0);
    expect(r.sgst).toBe(0);
    expect(r.igst).toBe(0);
    expect(r.labels.cgst).toBe("CGST @ 2.5% Under RCM");
    expect(r.labels.sgst).toBe("SGST @ 2.5% Under RCM");
  });

  it("different state → IGST 5%", () => {
    const r = gstFor(
      { state: "Delhi", is_rcm: false },
      10000,
      haryanaCompany,
    );
    expect(r.mode).toBe("IGST");
    expect(r.cgst).toBe(0);
    expect(r.sgst).toBe(0);
    expect(r.igst).toBe(500);
    expect(r.labels.igst).toBe("IGST @ 5%");
  });

  it("same state → CGST 2.5% + SGST 2.5%", () => {
    const r = gstFor(
      { state: "Haryana", is_rcm: false },
      10000,
      haryanaCompany,
    );
    expect(r.mode).toBe("CGST_SGST");
    expect(r.cgst).toBe(250);
    expect(r.sgst).toBe(250);
    expect(r.igst).toBe(0);
    expect(r.labels.cgst).toBe("CGST @ 2.5%");
    expect(r.labels.sgst).toBe("SGST @ 2.5%");
  });

  it("RCM trumps state difference", () => {
    const r = gstFor(
      { state: "Delhi", is_rcm: true },
      10000,
      haryanaCompany,
    );
    expect(r.mode).toBe("RCM");
    expect(r.igst).toBe(0);
  });

  it("rounds to 2 decimals", () => {
    const r = gstFor(
      { state: "Haryana", is_rcm: false },
      1234.56,
      haryanaCompany,
    );
    expect(r.cgst).toBe(30.86);
    expect(r.sgst).toBe(30.86);
  });
});
