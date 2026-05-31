/**
 * Progressive-disclosure helpers: hide a control when there isn't enough
 * data behind it to make it useful. The thresholds are deliberately low
 * (1, 3, 5) — at small counts the user scans, not searches/sorts/filters.
 *
 * All helpers operate on arbitrary item types via an accessor callback,
 * so the same rules work for invoices, trips, clients, vehicles, etc.
 */

export const LIST_THRESHOLDS = {
  search: 5, // search hides when fewer than this many items
  filter: 2, // a filter needs at least 2 distinct values to be useful
} as const;

function countDistinct<T>(
  items: readonly T[],
  accessor: (item: T) => string | null | undefined,
): number {
  const set = new Set<string>();
  for (const it of items) {
    const v = accessor(it);
    if (v != null && v !== "") set.add(String(v));
  }
  return set.size;
}

/** Search beats scan from ~5 items. Below that, hide it. */
export function shouldShowSearch(itemCount: number): boolean {
  return itemCount >= LIST_THRESHOLDS.search;
}

/**
 * A single-value filter (Client / Vehicle / Car type / Mode etc.) needs
 * at least two distinct values among the items to do anything useful.
 */
export function shouldShowFilter<T>(
  items: readonly T[],
  accessor: (item: T) => string | null | undefined,
): boolean {
  return countDistinct(items, accessor) >= LIST_THRESHOLDS.filter;
}

/**
 * Period filter is only useful when items span more than one calendar
 * month — otherwise narrowing by period can't change the result.
 */
export function shouldShowPeriodFilter<T>(
  items: readonly T[],
  dateAccessor: (item: T) => string | null | undefined,
): boolean {
  const months = new Set<string>();
  for (const it of items) {
    const iso = dateAccessor(it);
    if (!iso) continue;
    // "2026-05-12" → "2026-05"
    months.add(iso.slice(0, 7));
    if (months.size >= 2) return true;
  }
  return false;
}

/**
 * Given the full list of items and the available status pills, return
 * only the pills that actually have items behind them. If all visible
 * items share a single status, return [] — there's nothing to switch to,
 * so the entire pill row should be hidden.
 *
 * The "all" pill is always kept as the first entry IF other pills survive,
 * since it's how the user resets back from a narrowed status.
 */
export function visibleStatusPills<P extends { value: string }, T>(
  items: readonly T[],
  pills: readonly P[],
  statusAccessor: (item: T) => string,
  allValue = "all",
): P[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    const s = statusAccessor(it);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  // Distinct non-empty statuses present.
  const present = counts.size;
  if (present <= 1) return [];

  return pills.filter((p) => p.value === allValue || counts.has(p.value));
}
