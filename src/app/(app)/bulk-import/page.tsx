import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { BulkImportClient } from "./bulk-import-client";
import type { ImportEntity } from "@/lib/bulk-import/types";

export const metadata = { title: "Bulk import" };

const SCOPE_COPY: Record<ImportEntity, { title: string; description: string }> = {
  all: {
    title: "Bulk import",
    description: "Bring your clients, vehicles, and rate cards in from Excel.",
  },
  clients: {
    title: "Import clients",
    description: "Add multiple clients at once from the Clients sheet.",
  },
  vehicles: {
    title: "Import vehicles",
    description: "Add multiple vehicles at once from the Vehicles sheet.",
  },
  rate_cards: {
    title: "Import rate cards",
    description: "Add or update rate cards in bulk from the Rate Cards sheet.",
  },
};

function toScope(raw?: string): ImportEntity {
  if (raw === "clients" || raw === "vehicles" || raw === "rate_cards") {
    return raw;
  }
  return "all";
}

export default async function BulkImportPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  await requireMembership();
  const { scope: scopeRaw } = await searchParams;
  const scope = toScope(scopeRaw);
  const copy = SCOPE_COPY[scope];

  return (
    <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
      <PageHeader title={copy.title} description={copy.description} />
      <BulkImportClient initialScope={scope} />
    </div>
  );
}
