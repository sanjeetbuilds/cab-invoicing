/**
 * Monthly billed series for the current Indian financial year, used by
 * the dashboard peek and the billed by month screen. Reuses the same
 * issued invoice data the metric boxes use, so it never invents a new
 * source. The money helpers in lib/money format the figures.
 */

export interface MonthBilled {
  /** Year and month key, like "2026-05". */
  ym: string;
  /** Short month name, like "May". */
  name: string;
  /** Number of issued bills dated in this month. */
  count: number;
  /** Total billed in this month. */
  total: number;
  /** First day of the month, like "2026-05-01", for the invoices link. */
  fromIso: string;
  /** Last day of the month, like "2026-05-31", for the invoices link. */
  toIso: string;
}

export interface BilledByMonth {
  /** Twelve entries in order, April to March. */
  months: MonthBilled[];
  /** Index of the latest month that has any bills, or null if none. */
  latestIndex: number | null;
  /** First day of the financial year, like "2026-04-01". */
  fyStartIso: string;
}

/** Start year of the current Indian financial year. The year runs 1
 *  April to 31 March, so from April onward it starts this calendar
 *  year, and in January to March it started last year. This is the
 *  same rule the Billed this year box uses. */
export function financialYearStartYear(now: Date): number {
  // getMonth() is zero based, so April is 3.
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function shortMonth(year: number, monthIndex0: number): string {
  return new Date(year, monthIndex0, 1).toLocaleDateString("en-IN", {
    month: "short",
  });
}

/**
 * Group issued bills into the twelve months of the current financial
 * year. Months with no bills come back with count 0 and total 0, so the
 * series is always twelve entries long, April first and March last.
 */
export function buildBilledByMonth(
  rows: { invoice_date: string; net_amount: number | string | null }[],
  now: Date,
): BilledByMonth {
  const startYear = financialYearStartYear(now);
  const fyStartIso = `${startYear}-04-01`;

  // One pass to total by year and month.
  const byYm = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    const ym = (r.invoice_date ?? "").slice(0, 7);
    if (!ym) continue;
    const cur = byYm.get(ym) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(r.net_amount ?? 0);
    byYm.set(ym, cur);
  }

  const months: MonthBilled[] = [];
  for (let i = 0; i < 12; i++) {
    const offset = 3 + i; // April is month index 3.
    const monthIndex0 = offset % 12;
    const year = startYear + Math.floor(offset / 12);
    const ym = `${year}-${pad2(monthIndex0 + 1)}`;
    const agg = byYm.get(ym) ?? { count: 0, total: 0 };
    const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
    months.push({
      ym,
      name: shortMonth(year, monthIndex0),
      count: agg.count,
      total: agg.total,
      fromIso: `${ym}-01`,
      toIso: `${ym}-${pad2(lastDay)}`,
    });
  }

  let latestIndex: number | null = null;
  for (let i = 0; i < months.length; i++) {
    if (months[i].count > 0) latestIndex = i;
  }

  return { months, latestIndex, fyStartIso };
}
