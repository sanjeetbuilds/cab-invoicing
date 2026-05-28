import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { Client } from "@/lib/supabase/types";
import { QuotationForm } from "../quotation-form";

export const metadata = { title: "New quotation" };

export default async function NewQuotationPage() {
  const { supabase, membership } = await requireMembership();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("company_id", membership.company_id)
    .order("name", { ascending: true })
    .returns<Pick<Client, "id" | "name">[]>();

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/quotations"
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Quotations
          </Link>
        </p>
        <PageHeader
          title="New quotation"
          description="Add rate lines per (car × mode). On accept, these become the client's rate cards."
        />
      </div>
      <QuotationForm clients={clients ?? []} />
    </div>
  );
}
