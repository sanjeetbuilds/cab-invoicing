"use client";

import dynamic from "next/dynamic";
import { Font } from "@react-pdf/renderer";
import {
  InvoicePdf,
  INVOICE_FONT_FAMILY,
  type InvoicePdfProps,
} from "@/lib/pdf/invoice-pdf-doc";

// Browser registers the SAME Noto Sans Mono served from /public so the
// in-page preview is rendered by exactly the same @react-pdf Document
// the server uses for the downloadable PDF — single source of truth.
Font.register({
  family: INVOICE_FONT_FAMILY,
  fonts: [
    { src: "/fonts/NotoSansMono.ttf", fontWeight: 400 },
    { src: "/fonts/NotoSansMono.ttf", fontWeight: 700 },
  ],
});

// PDFViewer touches browser-only APIs (iframe, blob URLs) so it can't
// be SSR'd; load it on the client.
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[900px] bg-muted/30 text-sm text-muted-foreground rounded-lg">
        Loading preview…
      </div>
    ),
  },
);

export function InvoicePreview(props: InvoicePdfProps) {
  return (
    <PDFViewer
      width="100%"
      height={900}
      showToolbar={false}
      className="rounded-lg border border-border"
    >
      <InvoicePdf {...props} />
    </PDFViewer>
  );
}
