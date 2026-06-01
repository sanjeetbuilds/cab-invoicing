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
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SamplePreview } from "@/components/ui/sample-preview";
import { TripsSampleRows } from "@/components/ui/sample-rows";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Client,
  RateCard,
  Trip,
  TripMode,
  Vehicle,
} from "@/lib/supabase/types";
import { tripToLines, tripTotal } from "@/lib/trip-lines";
import { formatINR } from "@/lib/format";
import { AddTripButton } from "./add-trip-button";
import { TripRowActions } from "./trip-row-actions";

export const metadata = { title: "Trips" };

type StatusFilter = "all" | "uninvoiced" | "invoiced";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "uninvoiced", label: "Uninvoiced" },
  { value: "invoiced", label: "Invoiced" },
  { value: "all", label: "All" },
];

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

function effectiveBillingMethod(t: Trip): "slab" | "per_km" {
  if (t.mode === "local") return "slab";
  if (t.mode === "outstation") {
    return t.billing_method === "slab" ? "slab" : "per_km";
  }
  return "slab"; // transfer / package, unused by trip-lines for fixed-price
}

function rateKeyFor(
  client_id: string,
  car_type: string,
  mode: TripMode,
  plan_name: string | null,
): string {
  return `${client_id}|${car_type}|${mode}|${plan_name ?? ""}`;
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
      night_count: trip.night_count ?? (trip.night ? 1 : 0),
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
    { count: invoicedCount },
    { count: uninvoicedCount },
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
    // Used for progressive disclosure of the status pills below.
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("company_id", membership.company_id)
      .eq("invoiced", true),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("company_id", membership.company_id)
      .eq("invoiced", false),
  ]);

  const tripList = trips ?? [];
  const clientList = clients ?? [];
  const vehicleList = vehicles ?? [];
  const rateList = rateCards ?? [];

  const clientById = new Map(clientList.map((c) => [c.id, c]));
  const vehicleById = new Map(vehicleList.map((v) => [v.id, v]));
  const rateByKey = new Map(
    rateList.map((r) => [rateKeyFor(r.client_id, r.car_type, r.mode, r.plan_name), r]),
  );

  const noPrereqs = clientList.length === 0 || vehicleList.length === 0;
  // Status pills earn their space only when there's at least one of each
  //, otherwise switching tabs can't change what's shown.
  const showStatusPills =
    (invoicedCount ?? 0) > 0 && (uninvoicedCount ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trips"
        description="Your daily trips. Each trip becomes a line on a monthly bill."
      >
        <Link
          href="/trips/bulk"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "hidden lg:inline-flex",
            noPrereqs ? "pointer-events-none opacity-50" : "",
          )}
        >
          Bulk add
        </Link>
        <AddTripButton disabled={noPrereqs} />
      </PageHeader>

      {noPrereqs && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            First add one{" "}
            <Link href="/clients" className="font-medium text-primary underline-offset-2 hover:underline">client</Link>{" "}
            and one{" "}
            <Link href="/vehicles" className="font-medium text-primary underline-offset-2 hover:underline">vehicle</Link>.
            Then you can add trips.
          </CardContent>
        </Card>
      )}

      {showStatusPills && (
        <div className="flex gap-2">
          {FILTERS.map((f) => {
            const active = f.value === status;
            return (
              <Link
                key={f.value}
                href={f.value === "uninvoiced" ? "/trips" : `/trips?status=${f.value}`}
                className={cn(
                  "rounded-full border px-3 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-accent-soft text-accent-foreground border-accent-soft"
                    : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      )}

      {tripsError && (
        <p className="text-sm text-destructive">Failed to load: {tripsError.message}</p>
      )}

      {!tripsError && tripList.length === 0 && noPrereqs && (
        <Card>
          <CardContent className="py-12 px-4 text-center flex flex-col items-center gap-3">
            <h2 className="text-base font-semibold">No trips yet.</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add a client and a vehicle above first.
            </p>
          </CardContent>
        </Card>
      )}

      {!tripsError && tripList.length === 0 && !noPrereqs && (
        <SamplePreview
          icon={<Car className="h-4 w-4" />}
          title="This is where your trips live."
          body={
            status === "uninvoiced"
              ? "Add each trip here. Trips become lines on the next bill."
              : "Add each trip here. Filtered view, nothing matches yet."
          }
          primary={{ label: "Log trip", href: "/trips/new" }}
          setupHint={{ step: 5, total: 6 }}
        >
          <TripsSampleRows />
        </SamplePreview>
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
                  const lookupMode: TripMode =
                    t.mode === "transfer" || t.mode === "package"
                      ? t.mode
                      : effectiveBillingMethod(t) === "slab"
                        ? "local"
                        : "outstation";
                  const r = rateByKey.get(
                    rateKeyFor(t.client_id, t.car_type, lookupMode, t.plan_name),
                  );
                  const amount = computeAmount(t, r);
                  const needsRate = amount == null;
                  return (
                    <TableRow
                      key={t.id}
                      className={cn(
                        needsRate &&
                          "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
                      )}
                    >
                      <TableCell className="font-mono">{fmtDate(t.date)}</TableCell>
                      <TableCell className="font-medium">{c?.name ?? "-"}</TableCell>
                      <TableCell>
                        {v ? (
                          <span
                            className="font-mono text-xs inline-flex items-center gap-2"
                            title={
                              v.type !== t.car_type
                                ? `Override: billed as ${t.car_type} (vehicle is actually ${v.type}).`
                                : undefined
                            }
                          >
                            {v.number} · {t.car_type}
                            {v.type !== t.car_type && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                billed as
                              </span>
                            )}
                          </span>
                        ) : (
                          "-"
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
                        {t.driver_ta === 0 && !t.night && "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {needsRate ? (
                          <Link
                            href={`/rate-cards/new?client_id=${t.client_id}&car_type=${t.car_type}&mode=${t.mode}`}
                            className="text-xs font-medium text-primary hover:text-primary-hover"
                          >
                            + Add rate card
                          </Link>
                        ) : (
                          formatINR(amount)
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {needsRate ? (
                          <Badge variant="warning">⚠ Needs rate</Badge>
                        ) : t.invoiced ? (
                          <Badge>Invoiced</Badge>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TripRowActions trip={t} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-4 md:gap-5">
            {tripList.map((t) => {
              const c = clientById.get(t.client_id);
              const v = vehicleById.get(t.vehicle_id);
              const lookupMode: TripMode =
                t.mode === "transfer" || t.mode === "package"
                  ? t.mode
                  : effectiveBillingMethod(t) === "slab"
                    ? "local"
                    : "outstation";
              const r = rateByKey.get(
                rateKeyFor(t.client_id, t.car_type, lookupMode, t.plan_name),
              );
              const amount = computeAmount(t, r);
              const needsRate = amount == null;
              return (
                <Card
                  key={t.id}
                  className={cn(
                    needsRate &&
                      "border-amber-300 bg-amber-50/80 dark:border-amber-700/60 dark:bg-amber-950/30",
                  )}
                >
                  <CardContent className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{c?.name ?? "-"}</p>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                        {fmtDate(t.date)} · {v?.number ?? "-"} · {t.car_type}
                        {v && v.type !== t.car_type && (
                          <span
                            title={`Override: billed as ${t.car_type} (vehicle is actually ${v.type}).`}
                            className="h-1.5 w-1.5 rounded-full bg-amber-500"
                          />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.total_kms}km
                        {t.mode === "local" ? ` / ${t.total_hours}hr` : ""}
                        {t.driver_ta > 0 ? ` · TA×${t.driver_ta}` : ""}
                        {t.night ? " · night" : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {needsRate ? (
                          <>
                            <Badge variant="warning">⚠ Needs rate card</Badge>
                            <Link
                              href={`/rate-cards/new?client_id=${t.client_id}&car_type=${t.car_type}&mode=${t.mode}`}
                              className="text-xs font-medium text-primary hover:text-primary-hover"
                            >
                              + Add rate card
                            </Link>
                          </>
                        ) : (
                          <>
                            <span className="font-mono text-sm">
                              {formatINR(amount)}
                            </span>
                            {t.invoiced ? (
                              <Badge>Invoiced</Badge>
                            ) : (
                              <Badge variant="outline">Open</Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <TripRowActions trip={t} />
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
