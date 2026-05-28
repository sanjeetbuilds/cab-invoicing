// Inspect a woff/ttf and report whether the rupee (₹ U+20B9) and middle
// dot (· U+00B7) glyphs are present. Run with: node scripts/probe-font.mjs <file>
import { readFileSync } from "node:fs";
import * as fontkit from "fontkit";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/probe-font.mjs <path-to-font>");
  process.exit(2);
}

const buf = readFileSync(file);
const font = fontkit.create(buf);

const codepoints = [
  ["·", 0x00b7, "MIDDLE DOT"],
  ["₹", 0x20b9, "INDIAN RUPEE SIGN"],
  ["€", 0x20ac, "EURO"],
  ["&", 0x0026, "AMPERSAND"],
  ["—", 0x2014, "EM DASH"],
  ["A", 0x0041, "LATIN A"],
];

console.log(`Font: ${font.fullName ?? font.familyName ?? "(no name)"}`);
console.log(`Glyphs in font: ${font.numGlyphs}`);
for (const [char, cp, name] of codepoints) {
  const id = font.glyphForCodePoint(cp).id;
  const has = id > 0;
  console.log(
    `  ${char} U+${cp.toString(16).toUpperCase().padStart(4, "0")} ${name.padEnd(20)} → ${
      has ? `glyph #${id}` : "MISSING (would fall back)"
    }`,
  );
}
