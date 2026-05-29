"use client";

// Preview is just an iframe pointing at the same PDF route the download
// button hits. The browser's built-in PDF viewer renders it. Single source
// of truth: whatever ships from /api/invoices/:id/pdf is what you see.
//
// We add ?fresh=1 so the server route bypasses the Supabase Storage cache
// and regenerates from current data — otherwise editing an invoice and
// reloading would show the stale cached copy.
export function InvoicePreview({ invoiceId }: { invoiceId: string }) {
  return (
    <iframe
      src={`/api/invoices/${invoiceId}/pdf?fresh=1#toolbar=0&navpanes=0`}
      title="Invoice preview"
      className="w-full h-[900px] rounded-lg border border-border bg-muted/30"
    />
  );
}
