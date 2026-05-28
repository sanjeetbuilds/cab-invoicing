import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { Client } from "@/lib/supabase/types";
import { ClientForm } from "../../client-form";

export const metadata = { title: "Edit client" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .maybeSingle<Client>();

  if (!client) notFound();

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
        <PageHeader title={`Edit ${client.name}`} description="Update client details." />
      </div>
      <ClientForm client={client} />
    </div>
  );
}
