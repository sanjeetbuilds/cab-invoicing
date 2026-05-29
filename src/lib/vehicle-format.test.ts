import { describe, it, expect } from "vitest";
import { normalizeVehicleNumber, vehicleSearchKey } from "./vehicle-format";

describe("normalizeVehicleNumber — Indian format XX 00 XX 0000", () => {
  it("clean lowercase no-space → fully formatted uppercase", () => {
    expect(normalizeVehicleNumber("hr27v1234")).toBe("HR 27 V 1234");
  });
  it("already spaced", () => {
    expect(normalizeVehicleNumber("HR 26 ED 9083")).toBe("HR 26 ED 9083");
  });
  it("mixed case + extra spaces", () => {
    expect(normalizeVehicleNumber("  Hr  26  Ed  9083 ")).toBe("HR 26 ED 9083");
  });
  it("single-digit district + single-letter series", () => {
    expect(normalizeVehicleNumber("DL5C1234")).toBe("DL 5 C 1234");
  });
  it("three-letter series", () => {
    expect(normalizeVehicleNumber("UP14ABC0001")).toBe("UP 14 ABC 0001");
  });
  it("dashes / dots removed", () => {
    expect(normalizeVehicleNumber("HR-27-V-1234")).toBe("HR 27 V 1234");
  });

  it("partial input stays uppercased and stripped (can keep typing)", () => {
    expect(normalizeVehicleNumber("hr27")).toBe("HR27");
  });
  it("empty input → empty", () => {
    expect(normalizeVehicleNumber("")).toBe("");
  });
  it("invalid format (too many digits at end)", () => {
    expect(normalizeVehicleNumber("HR27V12345")).toBe("HR27V12345");
  });
});

describe("vehicleSearchKey", () => {
  it("strips spaces and uppercases", () => {
    expect(vehicleSearchKey("HR 26 ED 9083")).toBe("HR26ED9083");
    expect(vehicleSearchKey("hr26ed9083")).toBe("HR26ED9083");
  });
  it("preserves digits — last 4 search works", () => {
    expect(vehicleSearchKey("HR 26 ED 9083")).toContain("9083");
  });
});
