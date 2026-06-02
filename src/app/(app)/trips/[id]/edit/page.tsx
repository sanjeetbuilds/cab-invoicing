import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type {
  Client,
  RateCard,
  Trip,
  Vehicle,
} from "@/lib/supabase/types";
import { TripForm } from "../../trip-form";

export const metadata = { title: "Edit trip" };

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const [
    { data: trip },
    { data: clients },
    { data: vehicles },
    { data: rateCards },
  ] = await Promise.all([
    supabase
      .from("trips")
      .select("*")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Trip>(),
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

  if (!trip) notFound();
  if (trip.invoiced) {
    return (
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          <Link href="/trips" className="font-medium text-primary hover:text-primary-hover">
            ← Trips
          </Link>
        </p>
        <PageHeader title="Trip is locked" description="This trip is already on an invoice. Undo that invoice first to edit the trip." />
      </div>
    );
  }

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
        <PageHeader title="Edit trip" description="Update trip details." />
      </div>
      <TripForm
        trip={trip}
        clients={clients ?? []}
        vehicles={vehicles ?? []}
        rateCards={rateCards ?? []}
      />
    </div>
  );
}
