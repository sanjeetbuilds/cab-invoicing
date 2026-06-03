"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";

import { cn } from "@/lib/utils";
import { sharePdf, downloadPdf } from "@/lib/share-pdf";

/**
 * In-shell PDF viewer used by /invoices/[id] and /quotations/[id]. The
 * goal is to keep the user inside the app shell: no target="_blank", no
 * raw API redirect. The header carries a back arrow + the document
 * number + download + share; the document renders full width below.
 *
 * We paint the PDF pages onto our own <canvas> with pdf.js instead of
 * dropping the file into an <iframe>. An iframe hands rendering to the
 * browser's built-in PDF viewer, which adds a left thumbnail rail and
 * its own toolbar, and on some setups the framed document is "refused
 * to connect". Painting the pages ourselves means full width, no
 * thumbnail rail, no chrome, and nothing that can be blocked.
 *
 * Web Share API handles the file (filename preserved) on mobile; the
 * sharePdf helper falls back to a download with the same filename on
 * desktop or where Share isn't available.
 */

// pdf.js parses on a web worker. Point it at the worker that ships with
// the package; it bundles to a same-origin asset so CSP 'self' covers
// it and there is no CDN dependency.
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

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
  const [downloading, setDownloading] = useState(false);

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

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadPdf({ url: pdfUrl, filename });
      toast.success(`Downloaded ${filename}.`);
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || "Download failed.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Solid top bar. Back on the left, the title, download and share
          on the right. It sits in normal flow with a solid background,
          so the invoice starts fully below it and never under it. */}
      <header className="flex h-14 items-center justify-between gap-2 rounded-md border border-border bg-card px-2 sm:px-3">
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

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Download PDF"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#4f46e5] hover:bg-muted disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
          </button>
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
        </div>
      </header>

      {/* Document body. Pages are painted to canvas at the content width
          and flow with the normal page scroll, no inner scroll box and
          no iframe, so nothing can be blocked or refused to connect. */}
      <PdfCanvas
        key={pdfUrl}
        pdfUrl={pdfUrl}
        title={title}
        onDownload={handleDownload}
      />
    </div>
  );
}

// Largest CSS width we paint a page at. A4 at 96dpi is ~794px, so this
// keeps a page close to life size on desktop and lets it fill the width
// on phones.
const MAX_PAGE_WIDTH = 820;

type LoadStatus = "loading" | "ready" | "error";

function PdfCanvas({
  pdfUrl,
  title,
  onDownload,
}: {
  pdfUrl: string;
  title: string;
  onDownload: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const tasksRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());
  const seqRef = useRef(0);
  const widthRef = useRef(0);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("loading");

  // Load the document once. The parent keys this component on pdfUrl,
  // so a different document remounts fresh rather than mutating state
  // here. Same-origin fetch carries the session cookie so the authed
  // PDF endpoint serves it.
  useEffect(() => {
    const tasks = tasksRef.current;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(pdfUrl);
        if (!res.ok) throw new Error(`PDF request failed (${res.status}).`);
        const data = await res.arrayBuffer();
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) {
          pdf.destroy();
          return;
        }
        docRef.current = pdf;
        setPageCount(pdf.numPages);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      tasks.forEach((t) => t.cancel());
      tasks.clear();
      docRef.current?.destroy();
      docRef.current = null;
    };
  }, [pdfUrl]);

  // Paint every page at the current width. A fresh call bumps the
  // sequence so an in-flight pass bails, and we cancel any render still
  // running on a canvas before re-using it (pdf.js forbids two renders
  // on one canvas at once).
  const renderAll = useCallback(async () => {
    const pdf = docRef.current;
    const container = containerRef.current;
    if (!pdf || !container) return;
    const cssWidth = Math.min(container.clientWidth, MAX_PAGE_WIDTH);
    if (cssWidth <= 0) return;
    widthRef.current = cssWidth;
    const seq = ++seqRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    for (let n = 1; n <= pdf.numPages; n++) {
      if (seq !== seqRef.current) return;
      const canvas = container.querySelector<HTMLCanvasElement>(
        `canvas[data-page="${n}"]`,
      );
      if (!canvas) continue;
      const page = await pdf.getPage(n);
      if (seq !== seqRef.current) return;

      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${Math.round(viewport.height / dpr)}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      tasksRef.current.get(n)?.cancel();
      const task = page.render({ canvas, canvasContext: ctx, viewport });
      tasksRef.current.set(n, task);
      try {
        await task.promise;
      } catch {
        // RenderingCancelledException when superseded, safe to ignore.
      } finally {
        if (tasksRef.current.get(n) === task) tasksRef.current.delete(n);
      }
    }
  }, []);

  // Render once ready, then re-render only when the available width
  // actually changes (rotate / resize). Guarding on width stops the
  // ResizeObserver looping on the height growth its own paint causes.
  useEffect(() => {
    if (status !== "ready" || pageCount === 0) return;
    const container = containerRef.current;
    if (!container) return;

    renderAll();

    let frame = 0;
    const ro = new ResizeObserver((entries) => {
      const w = Math.min(entries[0].contentRect.width, MAX_PAGE_WIDTH);
      if (Math.abs(w - widthRef.current) < 1) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => renderAll());
    });
    ro.observe(container);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [status, pageCount, renderAll]);

  return (
    // No fixed height and no overflow here. The pages flow in the normal
    // page scroll, so there is one scrollbar for the whole page.
    <div className="w-full">
      <div className="mx-auto w-full max-w-[820px]">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading invoice…
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
            <p>Could not show the invoice here.</p>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 h-10 font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          className={cn(
            "flex flex-col items-center gap-4",
            status !== "ready" && "hidden",
          )}
        >
          {Array.from({ length: pageCount }, (_, i) => (
            <canvas
              key={i}
              data-page={i + 1}
              aria-label={`${title} page ${i + 1}`}
              className="block w-full rounded-sm bg-white shadow-card"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
