import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { CarType, Client, RateCard } from "@/lib/supabase/types";
import { RateBundlePageForm } from "../rate-bundle-page-form";

export const metadata = { title: "Add rate card" };

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];

export default async function NewRateCardPage({
  searchParams,
}: {
  searchParams: Promise<{
    client?: string;
    client_id?: string;
    car_type?: string;
  }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { client, client_id, car_type } = await searchParams;
  const presetClientId = client_id ?? client;
  const presetCarType = (CAR_TYPES as readonly string[]).includes(car_type ?? "")
    ? (car_type as CarType)
    : undefined;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("company_id", membership.company_id)
    .order("name", { ascending: true })
    .returns<Pick<Client, "id" | "name">[]>();

  // If both client and car type are pre-selected (e.g. opened from
  // the trip form via deep link), pre-fill any existing rate cards
  // for that combo so the editor can update them, not just create
  // a duplicate.
  let existing: RateCard[] = [];
  if (presetClientId && presetCarType) {
    const { data } = await supabase
      .from("rate_cards")
      .select("*")
      .eq("company_id", membership.company_id)
      .eq("client_id", presetClientId)
      .eq("car_type", presetCarType)
      .returns<RateCard[]>();
    existing = data ?? [];
  }

  const clientName =
    presetClientId
      ? (clients ?? []).find((c) => c.id === presetClientId)?.name
      : undefined;

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
          description="Set Local, Outstation, and any number of named packages for one client + car."
        />
      </div>
      <RateBundlePageForm
        clientId={presetClientId}
        clientName={clientName}
        carType={presetCarType}
        clients={clients ?? []}
        existing={existing}
      />
    </div>
  );
}
