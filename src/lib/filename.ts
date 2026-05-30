/**
 * Sanitize a client / company / vendor name into something safe for use
 * as a download filename across browsers and OSes.
 * - Replace whitespace + dots with underscores
 * - Strip everything that isn't ASCII letter, digit, underscore, or hyphen
 * - Collapse repeat underscores
 * - Trim leading / trailing underscores
 *
 * Falls back to "Unknown" if the sanitized result is empty so we never
 * ship a file named "Invoice_2037_.pdf".
 */
export function sanitizeForFilename(s: string | null | undefined): string {
  if (!s) return "Unknown";
  const cleaned = s
    .normalize("NFKD")
    .replace(/[\s.]+/g, "_")
    .replace(/[^A-Za-z0-9_\-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "Unknown";
}

export function invoiceFilename(
  invoiceNumber: number | string,
  clientName: string | null | undefined,
): string {
  return `Invoice_${invoiceNumber}_${sanitizeForFilename(clientName)}.pdf`;
}

export function quotationFilename(
  number: string,
  clientName: string | null | undefined,
): string {
  return `Quotation_${sanitizeForFilename(number)}_${sanitizeForFilename(clientName)}.pdf`;
}
