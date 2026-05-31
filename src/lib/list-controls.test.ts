import { describe, it, expect } from "vitest";
import {
  shouldShowFilter,
  shouldShowPeriodFilter,
  shouldShowSearch,
  visibleStatusPills,
} from "./list-controls";

describe("list-controls, progressive disclosure rules", () => {
  it("search hides under 5 items", () => {
    expect(shouldShowSearch(0)).toBe(false);
    expect(shouldShowSearch(4)).toBe(false);
    expect(shouldShowSearch(5)).toBe(true);
    expect(shouldShowSearch(50)).toBe(true);
  });

  it("filter hides when fewer than 2 distinct values exist", () => {
    const empty: { c: string | null }[] = [];
    expect(shouldShowFilter(empty, (x) => x.c)).toBe(false);
    expect(shouldShowFilter([{ c: "A" }, { c: "A" }, { c: "A" }], (x) => x.c)).toBe(false);
    expect(shouldShowFilter([{ c: "A" }, { c: "B" }], (x) => x.c)).toBe(true);
    // Null/empty values are ignored, a list of 5 nulls is still 0 distinct
    expect(shouldShowFilter([{ c: null }, { c: null }], (x) => x.c)).toBe(false);
  });

  it("period filter hides when all items fall in the same month", () => {
    const sameMonth = [{ d: "2026-05-01" }, { d: "2026-05-12" }, { d: "2026-05-31" }];
    expect(shouldShowPeriodFilter(sameMonth, (x) => x.d)).toBe(false);

    const twoMonths = [{ d: "2026-04-30" }, { d: "2026-05-01" }];
    expect(shouldShowPeriodFilter(twoMonths, (x) => x.d)).toBe(true);
  });

  it("status pills empty when all items share one status", () => {
    const pills = [
      { value: "all", label: "All" },
      { value: "unpaid", label: "Unpaid" },
      { value: "paid", label: "Paid" },
    ] as const;

    const allUnpaid = [{ s: "unpaid" }, { s: "unpaid" }, { s: "unpaid" }];
    expect(visibleStatusPills(allUnpaid, pills, (x) => x.s)).toEqual([]);

    const mixed = [{ s: "unpaid" }, { s: "paid" }];
    const out = visibleStatusPills(mixed, pills, (x) => x.s);
    // "all" stays as the reset target; "paid" + "unpaid" survive
    expect(out.map((p) => p.value)).toEqual(["all", "unpaid", "paid"]);
  });

  it("status pills drop pills with zero items", () => {
    const pills = [
      { value: "all", label: "All" },
      { value: "draft", label: "Draft" },
      { value: "sent", label: "Sent" },
      { value: "accepted", label: "Accepted" },
    ] as const;

    const draftsAndAccepted = [{ s: "draft" }, { s: "accepted" }];
    const out = visibleStatusPills(draftsAndAccepted, pills, (x) => x.s);
    expect(out.map((p) => p.value)).toEqual(["all", "draft", "accepted"]);
    // "sent" pill is hidden, there are zero sent items
  });
});
