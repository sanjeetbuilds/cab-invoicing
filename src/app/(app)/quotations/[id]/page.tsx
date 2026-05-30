import { redirect } from "next/navigation";

// Quotation listing IS the detail now — mobile cards carry the summary,
// laptop table row click opens the PDF directly. This route just sends
// old bookmarks to the PDF.
export default async function QuotationLegacyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/api/quotations/${id}/pdf`);
}
