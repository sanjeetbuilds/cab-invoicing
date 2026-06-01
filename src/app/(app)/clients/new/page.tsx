import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ClientForm } from "../client-form";

export const metadata = { title: "Add client" };

export default async function NewClientPage() {
  await requireMembership();

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/clients"
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Clients
          </Link>
        </p>
        <PageHeader
          title="Add client"
          description="Companies you bill. Their state decides whether GST is intra-state or inter-state."
        />
      </div>
      <ClientForm />
    </div>
  );
}
