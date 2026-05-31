import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { BulkImportClient } from "./bulk-import-client";

export const metadata = { title: "Bulk import" };

export default async function BulkImportPage() {
  await requireMembership();

  return (
    <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
      <PageHeader
        title="Bulk import"
        description="Bring your clients, vehicles, and rate cards in from Excel."
      />
      <BulkImportClient />
    </div>
  );
}
