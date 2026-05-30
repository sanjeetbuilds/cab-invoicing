import Link from "next/link";
import { Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { Client, Quotation } from "@/lib/supabase/types";
import { QuotationsList } from "./quotations-list";

export const metadata = { title: "Quotations" };

export const dynamic = "force-dynamic";

export default async function QuotationsPage() {
  const { supabase, membership } = await requireMembership();

  const [{ data: quotations }, { data: clients }] = await Promise.all([
    supabase
      .from("quotations")
      .select("*")
      .eq("company_id", membership.company_id)
      .order("date", { ascending: false })
      .returns<Quotation[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  const list = quotations ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Quotations"
        description="Send rates to clients. Accepting one creates or updates their rate cards."
      >
        <Link href="/quotations/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          New quotation
        </Link>
      </PageHeader>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-10 px-4 text-center flex flex-col items-center gap-3">
            <h2 className="text-base font-semibold">No quotations yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Send rates to a client. Accepting one creates or updates their
              rate cards.
            </p>
            <Link href="/quotations/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" />
              New quotation
            </Link>
          </CardContent>
        </Card>
      ) : (
        <QuotationsList quotations={list} clients={clients ?? []} />
      )}
    </div>
  );
}
