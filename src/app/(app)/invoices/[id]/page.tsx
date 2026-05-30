import { redirect } from "next/navigation";

// The invoice detail page is gone — the list page at /invoices shows the
// full card with inline PDF, Mark paid, and Reverse actions. This route
// stays as a thin fallback so old bookmarks / external links resolve.
export default async function InvoiceLegacyDetailPage() {
  redirect("/invoices");
}
