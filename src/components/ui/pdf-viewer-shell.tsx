"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { sharePdf } from "@/lib/share-pdf";

/**
 * In-shell PDF viewer used by /invoices/[id] and /quotations/[id]. The
 * goal is to keep the user inside the app shell: no target="_blank", no
 * raw API redirect. The header carries a back arrow + the document
 * number + a share button; the PDF renders in an iframe below.
 *
 * Web Share API handles the file (filename preserved) on mobile; the
 * sharePdf helper falls back to a download with the same filename on
 * desktop or where Share isn't available.
 */
export function PdfViewerShell({
  pdfUrl,
  filename,
  title,
  fallbackBackHref,
}: {
  /** Route to the inline PDF endpoint (e.g. /api/invoices/[id]/pdf). */
  pdfUrl: string;
  /** Recipient-facing filename ("Invoice_2037_Bharti_Foundation.pdf"). */
  filename: string;
  /** Short header title ("Invoice 2037"). */
  title: string;
  /** Where to land when there's no back-history (PWA deep-link). */
  fallbackBackHref: string;
}) {
  const router = useRouter();
  const [sharing, setSharing] = useState(false);

  function handleBack() {
    // PWA deep-links land here with no history. In that case explicit
    // navigation back to the listing keeps the user oriented.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackBackHref);
    }
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await sharePdf({ url: pdfUrl, filename, title });
      if (result === "downloaded") {
        toast.success(`Downloaded ${filename}.`);
      }
    } catch (err) {
      const e = err as Error;
      if (e.name !== "AbortError") {
        toast.error(e.message || "Share failed.");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    // Escape the parent main's padding so the iframe goes edge-to-edge.
    <div
      className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-8 flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Sticky sub-header, sits directly below the app top-bar. */}
      <header
        className={cn(
          "sticky z-20 px-3 sm:px-6 py-2 h-14",
          "bg-card/95 backdrop-blur border-b border-border",
          "flex items-center justify-between gap-2",
        )}
        style={{
          // Top-bar is 44 px mobile / 48 px sm+, with safe-area-inset on top.
          top: "calc(env(safe-area-inset-top) + 2.75rem)",
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#4f46e5] hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1
          className="flex-1 truncate text-center text-sm font-medium text-foreground"
          title={title}
        >
          {title}
        </h1>

        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          aria-label="Share PDF"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#4f46e5] hover:bg-muted disabled:opacity-60"
        >
          {sharing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Share2 className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* PDF body. The iframe fills the viewport between the sticky
          sub-header and the bottom-nav (mobile) / page bottom
          (desktop). 100dvh tracks the dynamic viewport so the iframe
          doesn't jump when the mobile browser chrome collapses. */}
      <iframe
        src={pdfUrl}
        title={title}
        className={cn(
          "w-full border-0 bg-muted",
          // Mobile: 10rem reserved for top-bar + sub-header + bottom-nav.
          // Desktop: 6rem reserved for top-bar + sub-header (no bottom-nav).
          "h-[calc(100dvh-10rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]",
          "lg:h-[calc(100dvh-6rem-env(safe-area-inset-top))]",
        )}
      />

      {/* Inline download fallback for browsers (e.g. some Android
          builds) where iframe PDFs don't render, share button is
          always there too, but a plain link is a clearer escape hatch. */}
      <noscript>
        <a
          href={pdfUrl}
          download={filename}
          className="block py-3 text-center text-sm text-primary underline"
        >
          Download {filename}
        </a>
      </noscript>
    </div>
  );
}
