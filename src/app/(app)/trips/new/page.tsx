import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { Client, RateCard, Trip, Vehicle } from "@/lib/supabase/types";
import { TripForm } from "../trip-form";

export const metadata = { title: "Log trip" };

export default async function NewTripPage() {
  const { supabase, membership } = await requireMembership();

  // The trip created most recently in the last 7 days seeds the client +
  // vehicle defaults on the form. Most users log the same client/vehicle
  // day after day; this turns the form into one tap to confirm + submit.
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [
    { data: clients },
    { data: vehicles },
    { data: rateCards },
    { data: lastTrip },
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
    supabase
      .from("trips")
      .select("client_id, vehicle_id, car_type, mode, billing_method")
      .eq("company_id", membership.company_id)
      .gte("date", sevenDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<
        Pick<Trip, "client_id" | "vehicle_id" | "car_type" | "mode" | "billing_method">
      >(),
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
        recentDefaults={lastTrip ?? null}
      />
    </div>
  );
}
