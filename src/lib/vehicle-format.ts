/**
 * Indian vehicle registration format: state code (2 letters) + district
 * (1-2 digits) + series (1-3 letters) + number (1-4 digits).
 *
 * normalizeVehicleNumber():
 *   - strips spaces, uppercases
 *   - if the cleaned string matches the full pattern, returns the
 *     canonical "XX 00 XX 0000" form
 *   - otherwise returns the uppercased / stripped input as-is so the
 *     user can keep typing
 *
 * Examples:
 *   "hr27v1234"       → "HR 27 V 1234"
 *   "hr 26 ed 9083"   → "HR 26 ED 9083"
 *   "DL5C1234"        → "DL 5 C 1234"
 *   "HR"              → "HR" (partial, can't format yet)
 */
export function normalizeVehicleNumber(raw: string): string {
  // Allow letters, digits, spaces. Strip everything else.
  const cleaned = (raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "");

  const full = /^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/.exec(cleaned);
  if (full) {
    return `${full[1]} ${full[2]} ${full[3]} ${full[4]}`;
  }
  return cleaned;
}

/** Looser match for the purposes of search, strips spaces from both sides. */
export function vehicleSearchKey(value: string): string {
  return (value ?? "").toUpperCase().replace(/\s+/g, "");
}
