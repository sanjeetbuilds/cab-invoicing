/**
 * Presentational pieces for the billed by month view: tiny bars and a
 * full column chart for the dashboard peek and the screen, and the row
 * list for phones on the screen. All server renderable, the only
 * interaction is a link per month and a native hover title, so no
 * client JavaScript is needed.
 */

import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";
import { formatInrShort } from "@/lib/money";
import type { MonthBilled } from "@/lib/billed-by-month";

// The latest month uses the strong green. The rest use a lighter green,
// a touch deeper for the bigger desktop columns than the tiny bars.
const LATEST = "#0F6E56";
const COLUMN_REST = "#5DCAA5";
const MINI_REST = "#9FE1CB";
const CARD =
  "rounded-lg border-[0.5px] border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06)]";

function maxTotal(months: MonthBilled[]): number {
  return months.reduce((mx, m) => (m.total > mx ? m.total : mx), 0);
}

function billsLabel(count: number): string {
  return `${count.toLocaleString("en-IN")} bill${count === 1 ? "" : "s"}`;
}

function columnTitle(m: MonthBilled): string {
  return `${m.name}, ${formatInrShort(m.total)}, ${billsLabel(m.count)}`;
}

/** Tiny shape only bars for the phone peek. No labels, not for reading. */
function MiniBars({
  months,
  latestIndex,
}: {
  months: MonthBilled[];
  latestIndex: number | null;
}) {
  const mx = maxTotal(months);
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {months.map((m, i) => {
        const h = mx > 0 ? (m.total / mx) * 100 : 0;
        return (
          <span
            key={m.ym}
            className="flex-1 rounded-sm"
            style={{
              height: `${h}%`,
              minHeight: m.total > 0 ? 2 : 0,
              backgroundColor: i === latestIndex ? LATEST : MINI_REST,
            }}
          />
        );
      })}
    </div>
  );
}

/** Full twelve column chart with month labels and hover titles. When
 *  hrefForMonth is given each column links to that month, otherwise the
 *  columns are plain (the dashboard peek links as a whole card). */
function MonthColumns({
  months,
  latestIndex,
  hrefForMonth,
}: {
  months: MonthBilled[];
  latestIndex: number | null;
  hrefForMonth?: (m: MonthBilled) => string;
}) {
  const mx = maxTotal(months);
  return (
    <div className="flex h-32 items-stretch gap-2">
      {months.map((m, i) => {
        const h = mx > 0 ? (m.total / mx) * 100 : 0;
        const color = i === latestIndex ? LATEST : COLUMN_REST;
        const inner = (
          <>
            <span className="flex w-full flex-1 items-end">
              <span
                className="w-full rounded-t-sm"
                style={{
                  height: `${h}%`,
                  minHeight: m.total > 0 ? 3 : 0,
                  backgroundColor: color,
                }}
              />
            </span>
            <span
              className="mt-1 text-center text-[11px]"
              style={i === latestIndex ? { color: LATEST } : undefined}
            >
              <span className={i === latestIndex ? "font-medium" : "text-muted-foreground"}>
                {m.name}
              </span>
            </span>
          </>
        );
        const cls = "flex min-w-0 flex-1 flex-col";
        return hrefForMonth ? (
          <Link
            key={m.ym}
            href={hrefForMonth(m)}
            title={columnTitle(m)}
            className={`${cls} rounded-md hover:bg-muted/40`}
          >
            {inner}
          </Link>
        ) : (
          <div key={m.ym} title={columnTitle(m)} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** One row per month for phones on the screen. A soft fill behind each
 *  row is proportional to that month total, text sits above it. */
function MonthRows({
  months,
  latestIndex,
  hrefForMonth,
}: {
  months: MonthBilled[];
  latestIndex: number | null;
  hrefForMonth: (m: MonthBilled) => string;
}) {
  const mx = maxTotal(months);
  return (
    <div className="flex flex-col gap-1.5">
      {months.map((m, i) => {
        const w = mx > 0 ? (m.total / mx) * 100 : 0;
        const isLatest = i === latestIndex;
        const fill = isLatest ? "rgba(15,110,86,0.24)" : "rgba(15,110,86,0.12)";
        return (
          <Link
            key={m.ym}
            href={hrefForMonth(m)}
            className="relative block overflow-hidden rounded-lg active:opacity-90"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0"
              style={{ width: `${w}%`, backgroundColor: fill }}
            />
            <span className="relative flex items-center justify-between gap-3 px-4 py-4">
              <span className="flex flex-col">
                <span
                  className="text-sm font-medium"
                  style={isLatest ? { color: LATEST } : undefined}
                >
                  {m.name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {billsLabel(m.count)}
                </span>
              </span>
              <span
                className="whitespace-nowrap text-base font-medium"
                style={isLatest ? { color: LATEST } : undefined}
              >
                {formatInrShort(m.total)}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** The dashboard peek. Tiny bars on phones, the full column chart on
 *  desktop. The whole card links to the billed by month screen. */
export function BilledByMonthPeek({
  months,
  latestIndex,
}: {
  months: MonthBilled[];
  latestIndex: number | null;
}) {
  return (
    <Link href="/billed-by-month" className={`block px-4 py-3.5 ${CARD}`}>
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-2 text-[13px] font-medium"
          style={{ color: LATEST }}
        >
          <Receipt className="h-[18px] w-[18px]" />
          Billed by month
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 md:hidden">
        <MiniBars months={months} latestIndex={latestIndex} />
      </div>
      <div className="mt-3 hidden md:block">
        <MonthColumns months={months} latestIndex={latestIndex} />
      </div>
    </Link>
  );
}

/** The screen body. Rows on phones, the full column chart on desktop.
 *  Both link each month to that month's bills. */
export function BilledByMonthDetail({
  months,
  latestIndex,
  hrefForMonth,
}: {
  months: MonthBilled[];
  latestIndex: number | null;
  hrefForMonth: (m: MonthBilled) => string;
}) {
  return (
    <>
      <div className="md:hidden">
        <MonthRows
          months={months}
          latestIndex={latestIndex}
          hrefForMonth={hrefForMonth}
        />
      </div>
      <div className={`hidden md:block px-4 py-6 ${CARD}`}>
        <MonthColumns
          months={months}
          latestIndex={latestIndex}
          hrefForMonth={hrefForMonth}
        />
      </div>
    </>
  );
}
