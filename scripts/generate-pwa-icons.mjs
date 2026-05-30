/**
 * One-shot generator for the PWA icon set. Writes PNGs to
 * public/icons/ — re-run when the brand mark changes.
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * Design: indigo #4f46e5 background, white "EB" wordmark centered.
 * Standard icons fill the canvas; the maskable version shrinks the
 * mark into the inner 80% safe-zone so Android's adaptive icon mask
 * never clips the brand.
 */
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";

const BRAND = "#4f46e5";
const FG = "#ffffff";
const OUT = path.join(process.cwd(), "public", "icons");

function svgIcon({ size, fontSize, padding = 0 }) {
  const radius = padding > 0 ? 0 : Math.round(size * 0.22);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND}"/>
  <text
    x="50%"
    y="50%"
    fill="${FG}"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    font-weight="700"
    font-size="${fontSize}"
    text-anchor="middle"
    dominant-baseline="central"
    letter-spacing="-${Math.round(fontSize * 0.04)}"
  >EB</text>
</svg>
  `.trim();
}

async function writePng(size, opts, filename) {
  const svg = Buffer.from(svgIcon({ size, ...opts }));
  const out = path.join(OUT, filename);
  await sharp(svg).png().toFile(out);
  console.log(`✓ ${filename} (${size}×${size})`);
}

await fs.mkdir(OUT, { recursive: true });

// Standard launcher icons — mark fills ~55% of the tile.
await writePng(192, { fontSize: 110 }, "icon-192.png");
await writePng(512, { fontSize: 300 }, "icon-512.png");

// Maskable: mark constrained to inner 80% so Android's circle/rounded
// mask never clips the wordmark. Smaller font, no rounded corners
// (the OS adds them).
await writePng(512, { fontSize: 220, padding: 1 }, "icon-maskable-512.png");

// Apple home-screen icon — iOS applies its own corner radius.
await writePng(180, { fontSize: 105 }, "apple-touch-icon.png");

// Favicons.
await writePng(32, { fontSize: 18 }, "favicon-32x32.png");
await writePng(16, { fontSize: 10 }, "favicon-16x16.png");

console.log(`\nWrote ${6} icons to ${OUT}`);
