import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SamplePreview } from "@/components/ui/sample-preview";
import { QuotationsSampleRows } from "@/components/ui/sample-rows";
import type { Client, Quotation } from "@/lib/supabase/types";
import { QuotationsList } from "./quotations-list";

export const metadata = { title: "Quotations" };

export const dynamic = "force-dynamic";

export default async function QuotationsPage() {
  const { supabase, membership } = await requireMembership();

  const [{ data: quotations }, { data: clients }, { data: company }] =
    await Promise.all([
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
      // Lifetime check, the counter only goes up. Distinguishes a
      // brand new account from one that has issued quotations
      // before and currently has none.
      supabase
        .from("companies")
        .select("next_quotation_number")
        .eq("id", membership.company_id)
        .maybeSingle<{ next_quotation_number: number }>(),
    ]);

  const list = quotations ?? [];
  const isEmpty = list.length === 0;
  const isFirstTime = (company?.next_quotation_number ?? 1) === 1;
  const showingSamples = isEmpty && isFirstTime;
  const showingCalmEmpty = isEmpty && !isFirstTime;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Quotations"
        description="Send rates to clients. Accepting one creates or updates their rate cards."
        bordered
      >
        <Link
          href="/quotations/new"
          className={buttonVariants({
            variant: showingSamples ? "outline" : "default",
          })}
        >
          <Plus className="h-4 w-4" />
          New quotation
        </Link>
      </PageHeader>

      {showingSamples && (
        <SamplePreview
          icon={<FileSignature className="h-4 w-4" />}
          title="This is where your quotations live."
          body="Send rates to a client. Accepting one creates or updates their rate cards."
          primary={{ label: "New quotation", href: "/quotations/new" }}
        >
          <QuotationsSampleRows />
        </SamplePreview>
      )}

      {showingCalmEmpty && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No quotations here.
          </CardContent>
        </Card>
      )}

      {!isEmpty && (
        <QuotationsList quotations={list} clients={clients ?? []} />
      )}
    </div>
  );
}
