// One-off generator for the TaxiMunshi social-share (Open Graph) image.
// Run with `node scripts/generate-og-image.mjs` whenever the brand mark,
// tagline or mascot art changes. Not part of the build — output is
// committed as a static file.
import { ImageResponse } from "next/dist/compiled/@vercel/og/index.node.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const fontsDir = path.join(root, "src/app/(landing)/fonts");

const devanagari800 = fs.readFileSync(path.join(fontsDir, "NotoSansDevanagari-800.ttf"));
const jakarta700 = fs.readFileSync(path.join(fontsDir, "PlusJakartaSans-700.ttf"));
const jakarta800 = fs.readFileSync(path.join(fontsDir, "PlusJakartaSans-800.ttf"));

const mascot = fs.readFileSync(path.join(root, "public/taximunshi/mascot-waving.png"));
const mascotDataUri = `data:image/png;base64,${mascot.toString("base64")}`;

const YELLOW = "#FFC21A";
const INK = "#1C1A17";
const MUTED = "#5E5A52";

const WIDTH = 1200;
const HEIGHT = 630;

function logoMark(size = 48) {
  const radius = Math.round(size * 0.22);
  const barH = Math.round(size * 0.1);
  const glyphSize = Math.round(size * 0.46);
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
        flexShrink: 0,
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

function tree() {
  return {
    type: "div",
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        position: "relative",
        background: "#FFFFFF",
        fontFamily: "Jakarta",
        overflow: "hidden",
      },
      children: [
        // Soft yellow backdrop blob behind the mascot, bleeding off the
        // right/bottom edge. Placed before the text column so later
        // (later-painted) siblings sit on top without needing z-index.
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              right: -140,
              bottom: -160,
              width: 760,
              height: 760,
              borderRadius: 760,
              background: YELLOW,
              display: "flex",
            },
          },
        },
        // Thin road-stripe accent along the very top, echoing the logo bar.
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 10,
              background: INK,
              display: "flex",
            },
          },
        },
        // Left column: logo, headline, subcopy, badge.
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 0 0 72px",
              width: 700,
              height: "100%",
              position: "relative",
            },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 40 },
                  children: [
                    logoMark(48),
                    {
                      type: "span",
                      props: {
                        style: { fontFamily: "Jakarta800", fontSize: 30, color: INK, display: "flex" },
                        children: "TaxiMunshi",
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    fontFamily: "Jakarta800",
                    fontSize: 56,
                    lineHeight: 1.15,
                    color: INK,
                    marginBottom: 26,
                  },
                  children: [
                    { type: "span", props: { style: { display: "flex" }, children: "Month-end billing?" } },
                    {
                      type: "span",
                      props: {
                        style: { display: "flex" },
                        children: [
                          {
                            type: "span",
                            props: {
                              style: {
                                display: "flex",
                                background: `linear-gradient(transparent 60%, ${YELLOW} 60%)`,
                              },
                              children: "Munshi",
                            },
                          },
                          { type: "span", props: { style: { display: "flex", marginLeft: 16 }, children: "sambhaal lega." } },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                type: "span",
                props: {
                  style: {
                    display: "flex",
                    fontFamily: "Jakarta700",
                    fontSize: 23,
                    lineHeight: 1.5,
                    color: MUTED,
                    maxWidth: 520,
                    marginBottom: 36,
                  },
                  children: "Duty slips, rate cards and GST invoices for Indian cab operators — sorted in minutes.",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: INK,
                    color: YELLOW,
                    fontFamily: "Jakarta800",
                    fontSize: 18,
                    padding: "12px 24px",
                    borderRadius: 999,
                    alignSelf: "flex-start",
                  },
                  children: "Free for 3 months",
                },
              },
            ],
          },
        },
        // Right column: mascot, peeking in from the bottom-right edge.
        {
          type: "img",
          props: {
            src: mascotDataUri,
            width: 460,
            height: 715,
            style: {
              position: "absolute",
              right: 54,
              bottom: -40,
            },
          },
        },
      ],
    },
  };
}

async function main() {
  const res = new ImageResponse(tree(), {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Devanagari", data: devanagari800, weight: 800, style: "normal" },
      { name: "Jakarta700", data: jakarta700, weight: 700, style: "normal" },
      { name: "Jakarta800", data: jakarta800, weight: 800, style: "normal" },
      { name: "Jakarta", data: jakarta700, weight: 700, style: "normal" },
    ],
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const outDir = path.join(root, "public/og");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "og-image.png");
  fs.writeFileSync(outPath, buf);
  console.log(`wrote og-image.png (${buf.length} bytes)`);
}

main();
