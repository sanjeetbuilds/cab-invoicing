import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { PdfViewerShell } from "@/components/ui/pdf-viewer-shell";
import { quotationFilename } from "@/lib/filename";
import type { Client, Quotation } from "@/lib/supabase/types";

export default async function QuotationViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const { data: q } = await supabase
    .from("quotations")
    .select("number, client_id, client_name")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .maybeSingle<Pick<Quotation, "number" | "client_id" | "client_name">>();

  if (!q) notFound();

  // Prefer the linked client's current name over the snapshot, clients
  // can be renamed after a quotation is issued and we want the latest.
  let clientName = q.client_name;
  if (q.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", q.client_id)
      .maybeSingle<Pick<Client, "name">>();
    clientName = client?.name ?? clientName;
  }

  const filename = quotationFilename(q.number, clientName);

  return (
    <PdfViewerShell
      pdfUrl={`/api/quotations/${id}/pdf`}
      filename={filename}
      title={`Quotation ${q.number}`}
      fallbackBackHref="/quotations"
    />
  );
}
