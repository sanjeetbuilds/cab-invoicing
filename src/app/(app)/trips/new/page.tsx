import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { Client, RateCard, Vehicle } from "@/lib/supabase/types";
import { TripForm } from "../trip-form";

export const metadata = { title: "Log trip" };

export default async function NewTripPage() {
  const { supabase, membership } = await requireMembership();

  const [
    { data: clients },
    { data: vehicles },
    { data: rateCards },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
    supabase
      .from("vehicles")
      .select("id, number, type, active")
      .eq("company_id", membership.company_id)
      .order("number", { ascending: true })
      .returns<Pick<Vehicle, "id" | "number" | "type" | "active">[]>(),
    supabase
      .from("rate_cards")
      .select("*")
      .eq("company_id", membership.company_id)
      .returns<RateCard[]>(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/trips"
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Trips
          </Link>
        </p>
        <PageHeader
          title="Log trip"
          description="One trip per duty. The amount preview uses the active rate card for this client + car + mode."
        />
      </div>
      <TripForm
        clients={clients ?? []}
        vehicles={vehicles ?? []}
        rateCards={rateCards ?? []}
      />
    </div>
  );
}
