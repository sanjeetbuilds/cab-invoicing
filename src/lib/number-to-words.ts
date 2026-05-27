const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
  "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]} ${ONES[o]}`;
}

/**
 * Indian-numbering-system "amount in words" used on GST invoices.
 *
 * The "&" separator appears immediately before the final two-digit (ones+tens)
 * group when that group is non-zero AND there is a higher group preceding it.
 * Pinned to the 9 reference cases in BUILD-SPEC.md.
 */
export function numberToWords(input: number): string {
  let n = Math.floor(Math.abs(input));
  if (n === 0) return "Zero";

  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000);    n %= 100000;
  const thousand = Math.floor(n / 1000);  n %= 1000;
  const hundred = Math.floor(n / 100);    n %= 100;
  const ones = n;

  const parts: string[] = [];
  if (crore > 0)    parts.push(`${twoDigits(crore)} Crore`);
  if (lakh > 0)     parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred > 0)  parts.push(`${ONES[hundred]} Hundred`);

  if (ones > 0) {
    const onesStr = twoDigits(ones);
    parts.push(parts.length > 0 ? `& ${onesStr}` : onesStr);
  }

  return parts.join(" ");
}
