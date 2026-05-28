import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { Client } from "@/lib/supabase/types";
import { RateCardForm } from "../rate-card-form";

export const metadata = { title: "Add rate card" };

export default async function NewRateCardPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { client } = await searchParams;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("company_id", membership.company_id)
    .order("name", { ascending: true })
    .returns<Pick<Client, "id" | "name">[]>();

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/rate-cards"
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Rate cards
          </Link>
        </p>
        <PageHeader
          title="Add rate card"
          description="One row per (client × car type × mode). Use ₹ values, no commas."
        />
      </div>
      <RateCardForm
        clients={clients ?? []}
        defaultClientId={client}
      />
    </div>
  );
}
