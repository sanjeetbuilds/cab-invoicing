/**
 * Server-side invoice PDF entry point. Registers the monospace font
 * by reading it directly off disk via process.cwd(); fast, no network
 * required at render time. The browser-side equivalent lives in
 * invoice-pdf-client.tsx and registers the same font from a URL.
 *
 * Both wrappers render the same JSX from invoice-pdf-doc.tsx so the
 * downloaded PDF and the in-page preview are guaranteed identical.
 */
import path from "node:path";
import { Font } from "@react-pdf/renderer";
import {
  InvoicePdf,
  INVOICE_FONT_FAMILY,
  type InvoicePdfProps,
} from "./invoice-pdf-doc";

// Single variable Noto Sans Mono TTF (1.6 MB), registered twice — once
// for regular weight (400) and once for bold (700). fontkit navigates
// the wght axis so the same file produces both cuts.
const fontFile = path.join(process.cwd(), "public", "fonts", "NotoSansMono.ttf");
Font.register({
  family: INVOICE_FONT_FAMILY,
  fonts: [
    { src: fontFile, fontWeight: 400 },
    { src: fontFile, fontWeight: 700 },
  ],
});

export { InvoicePdf };
export type { InvoicePdfProps };
