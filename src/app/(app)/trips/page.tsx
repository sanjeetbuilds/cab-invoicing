import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  Client,
  RateCard,
  Trip,
  Vehicle,
} from "@/lib/supabase/types";
import { tripToLines, tripTotal } from "@/lib/trip-lines";
import { AddTripButton } from "./add-trip-button";
import { TripRowActions } from "./trip-row-actions";

export const metadata = { title: "Trips — Krishna Cabs" };

type StatusFilter = "all" | "uninvoiced" | "invoiced";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "uninvoiced", label: "Uninvoiced" },
  { value: "invoiced", label: "Invoiced" },
  { value: "all", label: "All" },
];

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

function effectiveBillingMethod(t: Trip): "slab" | "per_km" {
  if (t.mode === "local") return "slab";
  return t.billing_method === "slab" ? "slab" : "per_km";
}

function computeAmount(trip: Trip, rate: RateCard | undefined): number | null {
  if (!rate) return null;
  const lines = tripToLines(
    {
      car_type: trip.car_type,
      mode: trip.mode,
      billing_method: effectiveBillingMethod(trip),
      total_kms: trip.total_kms,
      total_hours: trip.total_hours,
      night: trip.night,
      driver_ta: trip.driver_ta,
    },
    rate,
  );
  return tripTotal(lines);
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const params = await searchParams;
  const status: StatusFilter =
    params.status === "all" || params.status === "invoiced"
      ? params.status
      : "uninvoiced";

  const tripsQuery = supabase
    .from("trips")
    .select("*")
    .eq("company_id", membership.company_id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (status === "uninvoiced") tripsQuery.eq("invoiced", false);
  if (status === "invoiced") tripsQuery.eq("invoiced", true);

  const [
    { data: trips, error: tripsError },
    { data: clients },
    { data: vehicles },
    { data: rateCards },
  ] = await Promise.all([
    tripsQuery.returns<Trip[]>(),
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

  const tripList = trips ?? [];
  const clientList = clients ?? [];
  const vehicleList = vehicles ?? [];
  const rateList = rateCards ?? [];

  const clientById = new Map(clientList.map((c) => [c.id, c]));
  const vehicleById = new Map(vehicleList.map((v) => [v.id, v]));
  const rateByKey = new Map(
    rateList.map((r) => [`${r.client_id}|${r.car_type}|${r.mode}`, r]),
  );

  const noPrereqs = clientList.length === 0 || vehicleList.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trips</h1>
          <p className="text-sm text-muted-foreground">
            Daily duties. Each trip becomes a line on a monthly invoice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/trips/bulk"
            className={cn(
              "hidden lg:inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm hover:bg-muted",
              noPrereqs ? "pointer-events-none opacity-50" : "",
            )}
          >
            Bulk add
          </Link>
          <AddTripButton
            clients={clientList}
            vehicles={vehicleList}
            rateCards={rateList}
            disabled={noPrereqs}
          />
        </div>
      </div>

      {noPrereqs && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Add at least one{" "}
            <Link href="/clients" className="underline">client</Link> and one{" "}
            <Link href="/vehicles" className="underline">vehicle</Link> before
            logging trips.
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {FILTERS.map((f) => {
          const active = f.value === status;
          return (
            <Link
              key={f.value}
              href={f.value === "uninvoiced" ? "/trips" : `/trips?status=${f.value}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card hover:bg-accent",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {tripsError && (
        <p className="text-sm text-destructive">Failed to load: {tripsError.message}</p>
      )}

      {!tripsError && tripList.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No trips yet{status === "uninvoiced" ? " — all caught up." : "."}
          </CardContent>
        </Card>
      )}

      {tripList.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Kms / Hrs</TableHead>
                  <TableHead className="text-center">TA / Night</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tripList.map((t) => {
                  const c = clientById.get(t.client_id);
                  const v = vehicleById.get(t.vehicle_id);
                  const lookupMode = effectiveBillingMethod(t) === "slab" ? "local" : "outstation";
                  const r = rateByKey.get(`${t.client_id}|${t.car_type}|${lookupMode}`);
                  const amount = computeAmount(t, r);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono">{fmtDate(t.date)}</TableCell>
                      <TableCell className="font-medium">{c?.name ?? "—"}</TableCell>
                      <TableCell>
                        {v ? (
                          <span className="font-mono text-xs">
                            {v.number} · {t.car_type}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {t.mode === "local" ? (
                          <Badge variant="outline">Local</Badge>
                        ) : (
                          <Badge variant="secondary">Outstation</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {t.total_kms}km
                        {t.mode === "local" ? ` / ${t.total_hours}hr` : ""}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {t.driver_ta > 0 && <span>TA×{t.driver_ta} </span>}
                        {t.night && <span>· night</span>}
                        {t.driver_ta === 0 && !t.night && "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {amount == null ? (
                          <span className="text-destructive text-xs">no rate</span>
                        ) : (
                          fmtINR(amount)
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {t.invoiced ? (
                          <Badge>Invoiced</Badge>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TripRowActions
                          trip={t}
                          clients={clientList}
                          vehicles={vehicleList}
                          rateCards={rateList}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {tripList.map((t) => {
              const c = clientById.get(t.client_id);
              const v = vehicleById.get(t.vehicle_id);
              const r = rateByKey.get(`${t.client_id}|${t.car_type}|${t.mode}`);
              const amount = computeAmount(t, r);
              return (
                <Card key={t.id}>
                  <CardContent className="py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{c?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(t.date)} · {v?.number ?? "—"} · {t.car_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.total_kms}km
                        {t.mode === "local" ? ` / ${t.total_hours}hr` : ""}
                        {t.driver_ta > 0 ? ` · TA×${t.driver_ta}` : ""}
                        {t.night ? " · night" : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm">
                          {amount == null ? (
                            <span className="text-destructive">no rate</span>
                          ) : (
                            fmtINR(amount)
                          )}
                        </span>
                        {t.invoiced ? (
                          <Badge>Invoiced</Badge>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                      </div>
                    </div>
                    <TripRowActions
                      trip={t}
                      clients={clientList}
                      vehicles={vehicleList}
                      rateCards={rateList}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
