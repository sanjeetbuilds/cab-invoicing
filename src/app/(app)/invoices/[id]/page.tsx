import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { PdfViewerShell } from "@/components/ui/pdf-viewer-shell";
import { invoiceFilename } from "@/lib/filename";
import type { Company, Invoice } from "@/lib/supabase/types";

export default async function InvoiceViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const [{ data: invoice }, { data: company }] = await Promise.all([
    supabase
      .from("invoices")
      .select("invoice_number, client_name")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Pick<Invoice, "invoice_number" | "client_name">>(),
    supabase
      .from("companies")
      .select("invoice_prefix")
      .eq("id", membership.company_id)
      .maybeSingle<Pick<Company, "invoice_prefix">>(),
  ]);

  if (!invoice) notFound();

  const fullNumber = `${company?.invoice_prefix ?? ""}${invoice.invoice_number}`;
  const filename = invoiceFilename(fullNumber, invoice.client_name);

  return (
    <PdfViewerShell
      pdfUrl={`/api/invoices/${id}/pdf`}
      filename={filename}
      title={`Invoice ${fullNumber}`}
      fallbackBackHref="/invoices"
    />
  );
}
