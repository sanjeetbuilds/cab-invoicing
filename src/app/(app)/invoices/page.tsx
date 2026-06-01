import Link from "next/link";
import { Plus, Receipt, Zap } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SamplePreview } from "@/components/ui/sample-preview";
import { InvoicesSampleRows } from "@/components/ui/sample-rows";
import type { Client, Invoice } from "@/lib/supabase/types";
import { InvoicesList } from "./invoices-list";

export const metadata = { title: "Invoices" };

// Always fetch fresh, the listing must reflect every invoice the
// moment it's issued, including the one the user just navigated from.
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const { supabase, membership } = await requireMembership();

  const [
    { data: invoices, error },
    { data: lineRefs },
    { data: clients },
    { data: company },
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Invoices"
        description="Invoice numbers are never repeated."
        bordered
      >
        <Link
          href="/invoices/quick"
          className={buttonVariants({ variant: "outline" })}
        >
          <Zap className="h-4 w-4" />
          Quick invoice
        </Link>
        <Link
          href="/invoices/build"
          className={buttonVariants({ variant: isEmpty ? "outline" : "default" })}
        >
          <Plus className="h-4 w-4" />
          Build invoice
        </Link>
      </PageHeader>

      {error && (
        <p className="text-sm text-destructive">Failed to load: {error.message}</p>
      )}

      {!error && list.length === 0 ? (
        <SamplePreview
          icon={<Receipt className="h-4 w-4" />}
          title="This is where your invoices live."
          body="Pick a client's unbilled trips and turn them into one bill."
          primary={{ label: "Build invoice", href: "/invoices/build" }}
          setupHint={{ step: 6, total: 6 }}
        >
          <InvoicesSampleRows />
        </SamplePreview>
      ) : (
        <InvoicesList
          invoices={list}
          clients={clients ?? []}
          prefix={prefix}
          dutiesByInvoice={Object.fromEntries(dutiesByInvoice)}
        />
      )}
    </div>
  );
}
