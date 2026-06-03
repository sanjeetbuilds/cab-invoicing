import Link from "next/link";
import { Plus, ReceiptIndianRupee, Zap } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListHeader } from "@/components/ui/list-header";
import { PageHeader } from "@/components/ui/page-header";
import { SamplePreview } from "@/components/ui/sample-preview";
import { InvoicesSampleRows } from "@/components/ui/sample-rows";
import type { Client, Invoice } from "@/lib/supabase/types";
import { InvoicesList } from "./invoices-list";

export const metadata = { title: "Invoices" };

// Freshness is guaranteed by revalidatePath("/invoices") in every
// invoice / quick-invoice / quotation action. The route is already
// dynamic by inference because the auth wrapper reads cookies, so
// an explicit force-dynamic adds nothing and opts out of future
// partial-prerendering wins.

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  // A month tap on the billed by month view lands here with a date
  // range, applied as the list's custom period filter.
  const { from: initialFrom, to: initialTo } = await searchParams;

  const [
    { data: invoices, error },
    { data: lineRefs },
    { data: clients },
    { data: company },
    { count: lifetimeInvoiceCount },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("company_id", membership.company_id)
      // Invoice numbers are sequential and atomic, highest = newest.
      // Date can be backdated; number cannot. Sort by number.
      .order("invoice_number", { ascending: false })
      .returns<Invoice[]>(),
    // Pull just the join keys to compute distinct trip_id (= "Duties")
    // per invoice in JS. RLS scopes invoice_lines to this company's
    // invoices, so no further filter is needed.
    supabase
      .from("invoice_lines")
      .select("invoice_id, trip_id")
      .returns<{ invoice_id: string; trip_id: string | null }[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
    supabase
      .from("companies")
      .select("invoice_prefix")
      .eq("id", membership.company_id)
      .maybeSingle<{ invoice_prefix: string | null }>(),
    // True lifetime row count for first-time detection. We cannot
    // infer it from next_invoice_number, the operator can set a
    // custom starting number to continue an offline sequence (e.g.
    // 2000), so the counter is never 1 even with zero invoices.
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", membership.company_id),
  ]);

  const list = invoices ?? [];
  const prefix = company?.invoice_prefix ?? "";

  // Count distinct trip_ids per invoice, that's the "Duties" number.
  const dutiesByInvoice = new Map<string, number>();
  if (lineRefs) {
    const seen = new Map<string, Set<string>>();
    for (const row of lineRefs) {
      if (!row.trip_id) continue;
      let set = seen.get(row.invoice_id);
      if (!set) {
        set = new Set();
        seen.set(row.invoice_id, set);
      }
      set.add(row.trip_id);
    }
    for (const [inv, set] of seen) dutiesByInvoice.set(inv, set.size);
  }

  const isEmpty = list.length === 0;
  const isFirstTime = (lifetimeInvoiceCount ?? 0) === 0;
  const showingSamples = !error && isEmpty && isFirstTime;
  const showingCalmEmpty = !error && isEmpty && !isFirstTime;

  const actions = (
    <>
      <Link
        href="/invoices/quick"
        className={buttonVariants({ variant: "outline" })}
      >
        <Zap className="h-4 w-4" />
        Quick invoice
      </Link>
      <Link
        href="/invoices/build"
        className={buttonVariants({
          variant: showingSamples ? "outline" : "default",
        })}
      >
        <Plus className="h-4 w-4" />
        Build invoice
      </Link>
    </>
  );

  const header = (
    <PageHeader
      title="Invoices"
      description="A number belongs to one invoice at a time. Delete an undone invoice to free its number for reuse."
    >
      {actions}
    </PageHeader>
  );

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <>
          <ListHeader>{header}</ListHeader>
          <p className="text-sm text-destructive">Failed to load: {error.message}</p>
        </>
      )}

      {showingSamples && (
        <>
          <ListHeader>{header}</ListHeader>
          <SamplePreview
            icon={<ReceiptIndianRupee className="h-4 w-4" />}
            iconChipBg="#E1F5EE"
            iconChipFg="#085041"
            title="This is where your invoices live."
            body="Pick a client's unbilled trips and turn them into one bill."
            primary={{ label: "Build invoice", href: "/invoices/build" }}
            setupHint={{ step: 6, total: 6 }}
          >
            <InvoicesSampleRows />
          </SamplePreview>
        </>
      )}

      {showingCalmEmpty && (
        <>
          <ListHeader>{header}</ListHeader>
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No invoices here.
            </CardContent>
          </Card>
        </>
      )}

      {!error && !isEmpty && (
        <InvoicesList
          invoices={list}
          clients={clients ?? []}
          prefix={prefix}
          dutiesByInvoice={Object.fromEntries(dutiesByInvoice)}
          header={header}
          initialFrom={initialFrom}
          initialTo={initialTo}
        />
      )}
    </div>
  );
}
