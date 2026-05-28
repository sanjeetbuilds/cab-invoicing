import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  Client,
  Company,
  RateCard,
  Trip,
  Vehicle,
} from "@/lib/supabase/types";
import { InvoiceBuilderForm } from "./invoice-builder-form";

export const metadata = { title: "Build invoice" };

export default async function BuildInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const params = await searchParams;
  const clientId = params.client;

  const { data: uninvoicedTrips } = await supabase
    .from("trips")
    .select("*")
    .eq("company_id", membership.company_id)
    .eq("invoiced", false)
    .order("date", { ascending: true })
    .returns<Trip[]>();

  const tripList = uninvoicedTrips ?? [];

  if (!clientId) {
    // Client picker: only clients with at least one uninvoiced trip.
    const clientIds = Array.from(new Set(tripList.map((t) => t.client_id)));
    let clients: Pick<Client, "id" | "name">[] = [];
    if (clientIds.length > 0) {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", membership.company_id)
        .in("id", clientIds)
        .order("name", { ascending: true })
        .returns<Pick<Client, "id" | "name">[]>();
      clients = data ?? [];
    }

    const tripsByClient = new Map<string, number>();
    for (const t of tripList) {
      tripsByClient.set(t.client_id, (tripsByClient.get(t.client_id) ?? 0) + 1);
    }

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Build invoice</h1>
          <p className="text-sm text-muted-foreground">
            Pick a client to invoice for. Only clients with uninvoiced trips
            are listed.
          </p>
        </div>

        {clients.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No uninvoiced trips. Log some on the{" "}
              <Link href="/trips" className="underline">Trips</Link> page first.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/invoices/build?client=${c.id}`}
                className="block"
              >
                <Card className="hover:bg-accent transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {tripsByClient.get(c.id) ?? 0} uninvoiced trip
                        {(tripsByClient.get(c.id) ?? 0) === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Builder for the chosen client.
  const trips = tripList.filter((t) => t.client_id === clientId);

  const [
    { data: client },
    { data: company },
    { data: rateCards },
    { data: vehicles },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("company_id", membership.company_id)
      .maybeSingle<Client>(),
    supabase
      .from("companies")
      .select("*")
      .eq("id", membership.company_id)
      .maybeSingle<Company>(),
    supabase
      .from("rate_cards")
      .select("*")
      .eq("company_id", membership.company_id)
      .eq("client_id", clientId)
      .returns<RateCard[]>(),
    supabase
      .from("vehicles")
      .select("id, number, type")
      .eq("company_id", membership.company_id)
      .returns<Pick<Vehicle, "id" | "number" | "type">[]>(),
  ]);

  if (!client || !company) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Client not found. <Link href="/invoices/build" className="underline">Pick again</Link>.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/invoices/build" className="underline">← Pick a different client</Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          Invoice for {client.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {trips.length} uninvoiced trip{trips.length === 1 ? "" : "s"}. Untick any you want to defer.
        </p>
      </div>

      <InvoiceBuilderForm
        client={client}
        company={company}
        trips={trips}
        rateCards={rateCards ?? []}
        vehicles={vehicles ?? []}
      />
    </div>
  );
}
