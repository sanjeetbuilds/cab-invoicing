import { describe, it, expect } from "vitest";
import { numberToWords } from "./number-to-words";

describe("numberToWords — BUILD-SPEC reference cases", () => {
  const cases: [number, string][] = [
    [0,      "Zero"],
    [5800,   "Five Thousand Eight Hundred"],
    [14073,  "Fourteen Thousand & Seventy Three"],
    [27640,  "Twenty Seven Thousand Six Hundred & Forty"],
    [29794,  "Twenty Nine Thousand Seven Hundred & Ninety Four"],
    [32637,  "Thirty Two Thousand Six Hundred & Thirty Seven"],
    [37305,  "Thirty Seven Thousand Three Hundred & Five"],
    [100000, "One Lakh"],
    [105050, "One Lakh Five Thousand & Fifty"],
  ];

  for (const [n, expected] of cases) {
    it(`${n} → ${expected}`, () => {
      expect(numberToWords(n)).toBe(expected);
    });
  }
});

describe("numberToWords — extra coverage", () => {
  it("strips decimals", () => {
    expect(numberToWords(105050.49)).toBe("One Lakh Five Thousand & Fifty");
  });

  it("no '&' when ones-group is zero", () => {
    expect(numberToWords(100)).toBe("One Hundred");
    expect(numberToWords(1000)).toBe("One Thousand");
  });

  it("'&' between hundred and small ones", () => {
    expect(numberToWords(105)).toBe("One Hundred & Five");
  });

  it("crore", () => {
    expect(numberToWords(10000000)).toBe("One Crore");
    expect(numberToWords(12345678)).toBe(
      "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred & Seventy Eight",
    );
  });
});
