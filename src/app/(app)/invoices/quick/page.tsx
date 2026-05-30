import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { Client, Company, Vehicle } from "@/lib/supabase/types";
import { QuickInvoiceForm } from "./quick-invoice-form";

export const metadata = { title: "Quick invoice" };
export const dynamic = "force-dynamic";

export default async function QuickInvoicePage() {
  const { supabase, membership } = await requireMembership();

  const [{ data: vehicles }, { data: quickCustomers }, { data: company }] =
    await Promise.all([
      supabase
        .from("vehicles")
        .select("id, number, type, active")
        .eq("company_id", membership.company_id)
        .order("number", { ascending: true })
        .returns<Pick<Vehicle, "id" | "number" | "type" | "active">[]>(),
      supabase
        .from("clients")
        .select(
          "id, name, state, gstin, address, is_rcm, default_booked_by",
        )
        .eq("company_id", membership.company_id)
        .eq("is_quick_customer", true)
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<
          Pick<
            Client,
            | "id"
            | "name"
            | "state"
            | "gstin"
            | "address"
            | "is_rcm"
            | "default_booked_by"
          >[]
        >(),
      supabase
        .from("companies")
        .select("state")
        .eq("id", membership.company_id)
        .maybeSingle<Pick<Company, "state">>(),
    ]);

  return (
    <div className="mx-auto w-full max-w-5xl flex flex-col gap-4">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/invoices"
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Invoices
          </Link>
        </p>
        <PageHeader
          title="Quick invoice"
          description="One-tap invoice for walk-in / retail customers. Rates typed inline — no rate-card lookup."
        />
      </div>

      <QuickInvoiceForm
        vehicles={vehicles ?? []}
        quickCustomers={quickCustomers ?? []}
        companyState={company?.state ?? "Haryana"}
      />
    </div>
  );
}
