// One-off generator for the TaxiMunshi favicon/app-icon PNGs. Run with
// `node scripts/generate-icons.mjs` whenever the brand mark changes.
// Not part of the build — output is committed as static files.
import { ImageResponse } from "next/dist/compiled/@vercel/og/index.node.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const fontsDir = path.join(root, "src/app/(landing)/fonts");

const devanagari800 = fs.readFileSync(path.join(fontsDir, "NotoSansDevanagari-800.ttf"));

const YELLOW = "#FFC21A";
const INK = "#1C1A17";

/** The brand mark: yellow rounded square, a plain dark top bar standing
 *  in for the road-stripe detail (too fine to read at icon sizes), and
 *  the "मु" glyph. `maskable` drops the rounding and adds safe-zone
 *  padding so Android's own mask shape never clips the glyph. */
function mark({ size, maskable = false }) {
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const barH = Math.round(size * 0.1);
  const glyphSize = Math.round(size * (maskable ? 0.34 : 0.46));
  return {
    type: "div",
    props: {
      style: {
        width: size,
        height: size,
        borderRadius: radius,
        background: YELLOW,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: barH,
              background: INK,
              display: "flex",
            },
          },
        },
        {
          type: "span",
          props: {
            style: {
              fontFamily: "Devanagari",
              fontWeight: 800,
              fontSize: glyphSize,
              color: INK,
              marginTop: barH,
              display: "flex",
            },
            children: "मु",
          },
        },
      ],
    },
  };
}

async function render(size, { maskable = false } = {}) {
  const res = new ImageResponse(mark({ size, maskable }), {
    width: size,
    height: size,
    fonts: [{ name: "Devanagari", data: devanagari800, weight: 800, style: "normal" }],
  });
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const iconsDir = path.join(root, "public/icons");
  fs.mkdirSync(iconsDir, { recursive: true });

  const jobs = [
    ["favicon-16x16.png", 16, {}],
    ["favicon-32x32.png", 32, {}],
    ["apple-touch-icon.png", 180, {}],
    ["icon-192.png", 192, {}],
    ["icon-512.png", 512, {}],
    ["icon-maskable-512.png", 512, { maskable: true }],
  ];

  for (const [filename, size, opts] of jobs) {
    const buf = await render(size, opts);
    fs.writeFileSync(path.join(iconsDir, filename), buf);
    console.log(`wrote ${filename} (${buf.length} bytes)`);
  }
}

main();
