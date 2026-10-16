/**
 * Generates a random temporary password for admin-created and
 * team-invited accounts. Works in both the browser (the "+ New company"
 * form auto-fills one before submit) and on the server (resending a
 * temp password), so it uses the Web Crypto API rather than node:crypto.
 *
 * Excludes visually-confusing characters (0/O, 1/l/I) since these get
 * copy-pasted into WhatsApp and retyped on a phone keyboard.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const LETTERS = /[A-Za-z]/;
const DIGITS = /[0-9]/;

export function generateTempPassword(length = 10): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const buf = new Uint8Array(length);
    crypto.getRandomValues(buf);
    let out = "";
    for (const b of buf) out += ALPHABET[b % ALPHABET.length];
    // Re-roll on the rare draw that misses a class entirely, so the
    // result always matches the app's own "letter + number" password rule.
    if (LETTERS.test(out) && DIGITS.test(out)) return out;
  }
  // Astronomically unlikely to ever reach this, but guarantees termination.
  return "aB3" + ALPHABET[0].repeat(Math.max(0, length - 3));
}
