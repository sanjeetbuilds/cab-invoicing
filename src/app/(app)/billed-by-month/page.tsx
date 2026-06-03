import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import type { Invoice } from "@/lib/supabase/types";
import { buildBilledByMonth, type MonthBilled } from "@/lib/billed-by-month";
import { BilledByMonthDetail } from "@/components/billed-by-month-chart";

export const metadata = { title: "Billed by month" };

export default async function BilledByMonthPage() {
  const { supabase, membership } = await requireMembership();

  // Same issued invoice set the dashboard billed boxes use. Drafts are
  // not issued and reversed ones are undone, so both are left out.
  const { data: billedInvoices } = await supabase
    .from("invoices")
    .select("invoice_date, net_amount")
    .eq("company_id", membership.company_id)
    .in("status", ["unpaid", "paid"])
    .returns<Pick<Invoice, "invoice_date" | "net_amount">[]>();

  const { months, latestIndex } = buildBilledByMonth(
    billedInvoices ?? [],
    new Date(),
  );

  // Tapping a month opens the invoices list filtered to that month, via
  // the existing custom period range on the list.
  const hrefForMonth = (m: MonthBilled) =>
    `/invoices?from=${m.fromIso}&to=${m.toIso}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Billed by month, this year
        </h1>
      </div>

      <BilledByMonthDetail
        months={months}
        latestIndex={latestIndex}
        hrefForMonth={hrefForMonth}
      />
    </div>
  );
}
