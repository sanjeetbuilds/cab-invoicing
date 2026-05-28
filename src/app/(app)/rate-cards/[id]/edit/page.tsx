import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { Client, RateCard } from "@/lib/supabase/types";
import { RateCardForm } from "../../rate-card-form";

export const metadata = { title: "Edit rate card" };

export default async function EditRateCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const [{ data: rateCard }, { data: clients }] = await Promise.all([
    supabase
      .from("rate_cards")
      .select("*")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<RateCard>(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  if (!rateCard) notFound();

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
        <PageHeader title="Edit rate card" description="Update pricing." />
      </div>
      <RateCardForm rateCard={rateCard} clients={clients ?? []} />
    </div>
  );
}
