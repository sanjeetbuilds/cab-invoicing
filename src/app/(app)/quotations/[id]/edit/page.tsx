import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { Client, Quotation, QuotationLine } from "@/lib/supabase/types";
import { QuotationForm } from "../../quotation-form";

export const metadata = { title: "Edit quotation" };

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const [{ data: q }, { data: lines }, { data: clients }] = await Promise.all([
    supabase
      .from("quotations")
      .select("*")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Quotation>(),
    supabase
      .from("quotation_lines")
      .select("*")
      .eq("quotation_id", id)
      .order("sort_order", { ascending: true })
      .returns<QuotationLine[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  if (!q) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href={`/quotations/${id}`}
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Quotation {q.number}
          </Link>
        </p>
        <PageHeader title={`Edit ${q.number}`} />
      </div>
      <QuotationForm quotation={q} lines={lines ?? []} clients={clients ?? []} />
    </div>
  );
}
