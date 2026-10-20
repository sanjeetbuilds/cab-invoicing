/** Short reference code shown on error screens and logged alongside the
 *  real error, so a support email that quotes it can be matched to the
 *  right log line without needing Next.js's own (not always present)
 *  error.digest. */
export function generateErrorRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `ER-${out}`;
}
