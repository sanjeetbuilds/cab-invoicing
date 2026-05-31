import { describe, it, expect } from "vitest";
import {
  formatINR,
  formatINRBlank,
  formatINRPlain,
  formatQty,
} from "./format";

// The en-IN currency format on Node 20+ renders the rupee symbol as "₹"
// followed by the value without a space.
const RUPEE = "₹";

describe("formatINR, always renders", () => {
  it("zero", () => {
    expect(formatINR(0)).toBe(`${RUPEE}0.00`);
  });
  it("small number, no grouping needed", () => {
    expect(formatINR(150)).toBe(`${RUPEE}150.00`);
  });
  it("thousands, Indian grouping with one comma", () => {
    expect(formatINR(1500)).toBe(`${RUPEE}1,500.00`);
  });
  it("lakh, comma after the first two digits", () => {
    expect(formatINR(123456)).toBe(`${RUPEE}1,23,456.00`);
  });
  it("crore", () => {
    expect(formatINR(12345678.9)).toBe(`${RUPEE}1,23,45,678.90`);
  });
  it("null / undefined → ₹0.00", () => {
    expect(formatINR(null)).toBe(`${RUPEE}0.00`);
    expect(formatINR(undefined)).toBe(`${RUPEE}0.00`);
  });
  it("string input gets parsed", () => {
    expect(formatINR("2985")).toBe(`${RUPEE}2,985.00`);
  });
});

describe("formatINRBlank, blank when empty-ish", () => {
  it("zero → ''", () => {
    expect(formatINRBlank(0)).toBe("");
  });
  it("null / undefined → ''", () => {
    expect(formatINRBlank(null)).toBe("");
    expect(formatINRBlank(undefined)).toBe("");
  });
  it("non-zero renders normally", () => {
    expect(formatINRBlank(1035)).toBe(`${RUPEE}1,035.00`);
  });
});

describe("formatQty, no currency symbol", () => {
  it("integer qty stays 2dp", () => {
    expect(formatQty(707)).toBe("707.00");
  });
  it("decimal qty", () => {
    expect(formatQty(1.5)).toBe("1.50");
  });
  it("null → ''", () => {
    expect(formatQty(null)).toBe("");
  });
});

describe("formatINRPlain, no symbol, with grouping + 2dp", () => {
  it("matches the value column on real invoices", () => {
    expect(formatINRPlain(10605)).toBe("10,605.00");
    expect(formatINRPlain(123456)).toBe("1,23,456.00");
  });
});
