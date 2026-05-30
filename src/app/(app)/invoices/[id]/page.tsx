import { redirect } from "next/navigation";

// The invoice listing IS the detail view now — mobile cards show every
// piece of context the old summary page used to, and the laptop table
// row click opens the PDF directly. This route stays only as a thin
// redirect to the PDF so old bookmarks land on something useful.
export default async function InvoiceLegacyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/api/invoices/${id}/pdf`);
}
