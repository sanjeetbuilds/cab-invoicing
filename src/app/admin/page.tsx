import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadCompanyRows } from "./data";
import { CompanyTable } from "./company-table";

export const metadata = { title: "Companies" };

export default async function AdminPage() {
  const { admin } = await requireSuperAdmin();
  const rows = await loadCompanyRows(admin);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Companies"
        description="Company-level details only — no client, vehicle, rate card, trip, quotation, or invoice data is ever shown here."
      >
        <Link href="/admin/new" className={cn(buttonVariants(), "h-10")}>
          <Plus className="h-4 w-4" />
          New company
        </Link>
      </PageHeader>
      <CompanyTable rows={rows} />
    </div>
  );
}
