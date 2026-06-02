import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { Client, RateCard } from "@/lib/supabase/types";
import { RateBundlePageForm } from "../../rate-bundle-page-form";

export const metadata = { title: "Edit rate card" };

export default async function EditRateCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  // Resolve the row to its (client_id, car_type) so we can load the
  // whole bundle for that combo. Editing one rate now means editing
  // the whole client + car bundle in one panel.
  const { data: anchor } = await supabase
    .from("rate_cards")
    .select("client_id, car_type")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .maybeSingle<{ client_id: string; car_type: string }>();

  if (!anchor) notFound();

  const [{ data: bundle }, { data: client }] = await Promise.all([
    supabase
      .from("rate_cards")
      .select("*")
      .eq("company_id", membership.company_id)
      .eq("client_id", anchor.client_id)
      .eq("car_type", anchor.car_type)
      .returns<RateCard[]>(),
    supabase
      .from("clients")
      .select("name")
      .eq("id", anchor.client_id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Pick<Client, "name">>(),
  ]);

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
          title="Edit rates"
          description={`${client?.name ?? "Client"}, ${anchor.car_type}. Local, Outstation, and packages in one panel.`}
        />
      </div>
      <RateBundlePageForm
        clientId={anchor.client_id}
        clientName={client?.name ?? undefined}
        carType={anchor.car_type as RateCard["car_type"]}
        existing={bundle ?? []}
      />
    </div>
  );
}
