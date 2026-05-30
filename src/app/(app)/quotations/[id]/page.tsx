import { redirect } from "next/navigation";

// Quotation detail page folded into the list at /quotations. Inline
// Accept / Edit / Delete / Copy actions live on each card. This route
// stays as a thin fallback for old bookmarks.
export default async function QuotationLegacyDetailPage() {
  redirect("/quotations");
}
