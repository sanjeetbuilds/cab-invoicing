import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ListHeader } from "@/components/ui/list-header";
import { PageHeader } from "@/components/ui/page-header";
import { SamplePreview } from "@/components/ui/sample-preview";
import { QuotationsSampleRows } from "@/components/ui/sample-rows";
import type { Client, Quotation } from "@/lib/supabase/types";
import { QuotationsList } from "./quotations-list";

export const metadata = { title: "Quotations" };

export default async function QuotationsPage() {
  const { supabase, membership } = await requireMembership();

  const [
    { data: quotations },
    { data: clients },
    { count: lifetimeQuotationCount },
  ] = await Promise.all([
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
    // True lifetime row count for first-time detection. Operators
    // can set a custom starting quotation number, so the counter
    // on companies cannot stand in for "has ever issued one".
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", membership.company_id),
  ]);

  const list = quotations ?? [];
  const isEmpty = list.length === 0;
  const isFirstTime = (lifetimeQuotationCount ?? 0) === 0;
  const showingSamples = isEmpty && isFirstTime;
  const showingCalmEmpty = isEmpty && !isFirstTime;

  const actions = (
    <Link
      href="/quotations/new"
      className={cn(
        buttonVariants({ variant: showingSamples ? "outline" : "default" }),
        "h-10",
      )}
    >
      <Plus className="h-4 w-4" />
      New quotation
    </Link>
  );

  const description =
    "Send your prices to a client. When they accept, it saves as their rates.";
  // Empty and sample states keep the action beside the title. The
  // populated list gets a title-only header and renders the action row
  // with the filter so they share one line.
  const fullHeader = (
    <PageHeader title="Quotations" description={description}>
      {actions}
    </PageHeader>
  );
  const titleHeader = (
    <PageHeader title="Quotations" description={description} />
  );

  return (
    <div className="flex flex-col gap-4">
      {showingSamples && (
        <>
          <ListHeader>{fullHeader}</ListHeader>
          <SamplePreview
            icon={<FileSignature className="h-4 w-4" />}
            iconChipBg="#E6F1FB"
            iconChipFg="#0C447C"
            title="This is where your quotations live."
            body="Send your prices to a client. When they accept, it saves as their rates."
            primary={{ label: "New quotation", href: "/quotations/new" }}
          >
            <QuotationsSampleRows />
          </SamplePreview>
        </>
      )}

      {showingCalmEmpty && (
        <>
          <ListHeader>{fullHeader}</ListHeader>
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No quotations here.
            </CardContent>
          </Card>
        </>
      )}

      {!isEmpty && (
        <QuotationsList
          quotations={list}
          clients={clients ?? []}
          header={titleHeader}
          actions={actions}
        />
      )}
    </div>
  );
}
