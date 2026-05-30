/**
 * Single source of truth for rupee formatting across the app.
 *
 * formatINR(n)        → "₹1,500.00"  (always renders, even for 0)
 * formatINRBlank(n)   → ""           when n is 0/null/undefined, else "₹1,500.00"
 * formatQty(n)        → "25.00"      number-only, no symbol, Indian grouping
 * formatINRPlain(n)   → "1,500.00"   no symbol — for tables that show ₹ in a column header
 *
 * Uses Intl.NumberFormat('en-IN', ...) so larger numbers paginate as
 * lakh/crore style (₹1,23,456.78 / ₹12,34,56,789.00).
 */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  currencyDisplay: "symbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function safeNumber(n: number | string | null | undefined): number | null {
  if (n == null) return null;
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return null;
  return v;
}

/** Always renders an amount; falls back to "₹0.00" for null/NaN. */
export function formatINR(n: number | string | null | undefined): string {
  const v = safeNumber(n);
  return inrFormatter.format(v ?? 0);
}

/** Returns "" when n is 0/null/undefined — for line cells where blank is the intent. */
export function formatINRBlank(n: number | string | null | undefined): string {
  const v = safeNumber(n);
  if (v == null || v === 0) return "";
  return inrFormatter.format(v);
}

/** Quantity formatter — Indian grouping + 2dp, no currency symbol. */
export function formatQty(n: number | string | null | undefined): string {
  const v = safeNumber(n);
  if (v == null) return "";
  return numberFormatter.format(v);
}

/** Amount without the ₹ symbol — keeps the Indian grouping + 2dp. */
export function formatINRPlain(n: number | string | null | undefined): string {
  const v = safeNumber(n);
  return numberFormatter.format(v ?? 0);
}

/**
 * Duty-table cell formatter — returns an em dash for empty / null,
 * never a blank cell. Used in the Units / Rate / Amount columns of
 * the invoice's duty rows so missing fields stay visible as "—".
 */
export function formatINRDash(n: number | string | null | undefined): string {
  const v = safeNumber(n);
  if (v == null || v === 0) return "—";
  return inrFormatter.format(v);
}

export function formatQtyDash(n: number | string | null | undefined): string {
  const v = safeNumber(n);
  if (v == null) return "—";
  return numberFormatter.format(v);
}
