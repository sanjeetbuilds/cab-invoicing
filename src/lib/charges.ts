export interface ChargeFlags {
  toll: boolean;
  tax: boolean;
  parking: boolean;
}

const DEFAULT_LABEL = "Toll & Parking";

/**
 * Build the "toll/tax/parking" line label from a union of ticked boxes.
 *
 * Order is fixed: Toll → Tax → Parking. Two terms join with " & ".
 * Three terms use ", " between all but the last, " & " before the last.
 * No "Charges" suffix.
 *
 * Fallback: if nothing is ticked but `amountForFallback > 0`,
 * return "Toll & Parking" so the invoice still renders cleanly.
 * (The trip form is expected to warn the user before they reach this state.)
 */
export function chargeLabel(
  flags: ChargeFlags,
  amountForFallback = 0,
): string {
  const parts: string[] = [];
  if (flags.toll) parts.push("Toll");
  if (flags.tax) parts.push("Tax");
  if (flags.parking) parts.push("Parking");

  if (parts.length === 0) {
    return amountForFallback > 0 ? DEFAULT_LABEL : DEFAULT_LABEL;
  }
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]}`;
}

/**
 * Union ticked flags across many trips.
 */
export function unionChargeFlags(rows: ChargeFlags[]): ChargeFlags {
  return rows.reduce<ChargeFlags>(
    (acc, r) => ({
      toll: acc.toll || r.toll,
      tax: acc.tax || r.tax,
      parking: acc.parking || r.parking,
    }),
    { toll: false, tax: false, parking: false },
  );
}
