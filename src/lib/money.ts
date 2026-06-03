/**
 * Compact and exact rupee formatting for the dashboard metric boxes.
 *
 * formatInrShort keeps a figure inside a small box at any size by
 * switching to lakh and crore. formatInrFull gives the precise figure
 * with Indian commas for the hover title and the tap to expand.
 *
 * Both use en-IN grouping, so values read in the lakh and crore style.
 */

/** Up to two decimals with Indian grouping, trailing zeros dropped, so
 *  2.5 stays 2.5 and 2 stays 2 rather than 2.50 or 2.00. */
function trimDecimals(x: number): string {
  return x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Short rupee figure that stays inside a small box whatever the size.
 *  Below one lakh: the full figure with Indian commas, like ₹84,200.
 *  One lakh up to a crore: lakh, like ₹2.5 L or ₹38.4 L.
 *  A crore and above: crore, like ₹2.46 Cr. */
export function formatInrShort(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(n);
  if (abs < 100000) {
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }
  if (abs < 10000000) {
    return `₹${trimDecimals(n / 100000)} L`;
  }
  return `₹${trimDecimals(n / 10000000)} Cr`;
}

/** Exact rupee figure with Indian commas, like ₹2,45,67,890. Paise are
 *  shown only when the amount is not a whole number of rupees. */
export function formatInrFull(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
