import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import type { Company, Invoice } from "@/lib/supabase/types";
import { InvoiceActions } from "./invoice-actions";
import { InvoicePreview } from "./invoice-preview";

export const metadata = { title: "Invoice" };

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

export default async function InvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const [
    { data: invoice },
    { data: company },
    { count: lineCount },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Invoice>(),
    supabase
      .from("companies")
      .select("*")
      .eq("id", membership.company_id)
      .maybeSingle<Company>(),
    supabase
      .from("invoice_lines")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", id),
  ]);

  if (!invoice || !company) notFound();

  const fullNumber = `${company.invoice_prefix ?? ""}${invoice.invoice_number}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/invoices" className="font-medium text-primary hover:text-primary-hover">
              ← Invoices
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            Invoice {fullNumber}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={invoice.status} />
            <span className="text-sm text-muted-foreground">
              Issued {fmtDate(invoice.invoice_date)}
            </span>
            {invoice.status === "paid" && invoice.paid_date && (
              <span className="text-sm text-muted-foreground">
                · Paid {fmtDate(invoice.paid_date)}
              </span>
            )}
          </div>
        </div>
        <InvoiceActions invoice={invoice} />
      </div>

      <InvoicePreview
        invoice={invoice}
        company={company}
        lineCount={lineCount ?? 0}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  switch (status) {
    case "paid":
      return <Badge variant="success">Paid</Badge>;
    case "unpaid":
      return <Badge variant="warning">Unpaid</Badge>;
    case "reversed":
      return <Badge variant="ghost">Reversed</Badge>;
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
  }
}
