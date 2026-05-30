import Link from "next/link";
import { Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { Client, Quotation } from "@/lib/supabase/types";
import { QuotationsList } from "./quotations-list";

export const metadata = { title: "Quotations" };

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
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No quotations yet.{" "}
            <Link
              href="/quotations/new"
              className="font-medium text-primary hover:text-primary-hover"
            >
              Create one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <QuotationsList quotations={list} clients={clients ?? []} />
      )}
    </div>
  );
}
