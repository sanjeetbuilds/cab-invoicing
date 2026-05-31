/**
 * One-shot generator for the PWA icon set. Writes PNGs to
 * public/icons/, re-run when the brand mark changes.
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

/**
 * `square: true` produces a flat-edge opaque tile with no rounded
 * corners. Apple touch icon + maskable Android icon both need this -
 * iOS rounds the corners on its end, and Android's adaptive-icon mask
 * does the same. Shipping our own rounded PNG produces double-rounded
 * + transparent gaps where the home screen wallpaper bleeds through.
 *
 * For the generic 192 / 512 Web App Manifest icons we still want a
 * subtle rounded corner so they look correct in browsers / settings
 * UIs that don't apply their own mask.
 */
function svgIcon({ size, fontSize, square = false }) {
  const radius = square ? 0 : Math.round(size * 0.22);
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
  // .flatten() collapses any alpha into the indigo background so the
  // output is fully opaque. iOS needs this, a PNG with alpha gets the
  // home-screen wallpaper bleeding through the rounded corners.
  await sharp(svg)
    .flatten({ background: BRAND })
    .png()
    .toFile(out);
  console.log(`✓ ${filename} (${size}×${size})`);
}

await fs.mkdir(OUT, { recursive: true });

// Standard launcher icons, mark fills ~55% of the tile. These keep
// their own subtle radius for surfaces that don't apply a mask.
await writePng(192, { fontSize: 110 }, "icon-192.png");
await writePng(512, { fontSize: 300 }, "icon-512.png");

// Maskable Android: flat square, mark constrained to inner ~70% so
// the launcher's circle / squircle mask never clips the wordmark.
await writePng(512, { fontSize: 220, square: true }, "icon-maskable-512.png");

// Apple home-screen icon: flat opaque square. iOS Safari rounds the
// corners itself; if we ship rounded + transparent PNG corners we get
// double-rounded edges with home-screen wallpaper bleeding through.
await writePng(180, { fontSize: 105, square: true }, "apple-touch-icon.png");

// Favicons.
await writePng(32, { fontSize: 18 }, "favicon-32x32.png");
await writePng(16, { fontSize: 10 }, "favicon-16x16.png");

console.log(`\nWrote 6 icons to ${OUT}`);
