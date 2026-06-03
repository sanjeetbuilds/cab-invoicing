import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ListHeader } from "@/components/ui/list-header";
import { PageHeader } from "@/components/ui/page-header";
import { SamplePreview } from "@/components/ui/sample-preview";
import { TripsSampleRows } from "@/components/ui/sample-rows";
import { Route } from "lucide-react";
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

  // "Has ever logged a trip". The counts ignore the status filter,
  // so an operator with 100 invoiced trips and 0 uninvoiced still
  // reads as experienced when they land on the default uninvoiced
  // view.
  const hasEverTrip =
    (invoicedCount ?? 0) > 0 || (uninvoicedCount ?? 0) > 0;
  const isFirstTime = !hasEverTrip;

  // Show the tutorial samples only for a true first-time operator,
  // never for an experienced one whose current filter happens to be
  // empty. Existing operators with an empty filtered view get the
  // calm empty card below instead.
  const showingSamples =
    !tripsError && tripList.length === 0 && !noPrereqs && isFirstTime;
  const showingCalmEmpty =
    !tripsError && tripList.length === 0 && !noPrereqs && !isFirstTime;

  return (
    <div className="flex flex-col gap-6">
      <ListHeader>
        <PageHeader
          title="Trips"
          description="Your daily trips. Each trip becomes a line on a monthly bill."
        >
          <Link
            href="/trips/bulk"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 hidden lg:inline-flex",
              noPrereqs ? "pointer-events-none opacity-50" : "",
            )}
          >
            Bulk add
          </Link>
          <AddTripButton disabled={noPrereqs} muted={showingSamples} />
        </PageHeader>

        {showStatusPills && (
          <div className="flex gap-2">
            {FILTERS.map((f) => {
              const active = f.value === status;
              return (
                <Link
                  key={f.value}
                  href={f.value === "uninvoiced" ? "/trips" : `/trips?status=${f.value}`}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150",
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
      </ListHeader>

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

      {showingSamples && (
        <SamplePreview
          icon={<Route className="h-4 w-4" />}
          iconChipBg="#EEEDFE"
          iconChipFg="#3C3489"
          title="This is where your trips live."
          body="Add each trip here. Trips become lines on the next bill."
          primary={{ label: "Log trip", href: "/trips/new" }}
          setupHint={{ step: 5, total: 6 }}
        >
          <TripsSampleRows />
        </SamplePreview>
      )}

      {showingCalmEmpty && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {status === "uninvoiced"
              ? "All caught up. No trips waiting to be billed."
              : status === "invoiced"
                ? "No invoiced trips here yet."
                : "No trips here."}
          </CardContent>
        </Card>
      )}

      {tripList.length > 0 && (
        <>
          {/* Desktop and tablet, md and up. A fixed layout table that
              always fits the page width, so there is no horizontal
              scroll. Client takes the slack, the rest size to content,
              and overflow-hidden on the frame is the safety net. */}
          <div className="hidden md:block overflow-hidden rounded-md border border-border bg-card">
            <table className="w-full table-fixed text-sm">
              <thead className="border-b border-border bg-muted/60">
                <tr className="[&>th]:h-10 [&>th]:px-2.5 [&>th]:align-middle [&>th]:whitespace-nowrap [&>th]:text-[11px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
                  <th className="w-[68px] text-left">Date</th>
                  <th className="text-left">Client</th>
                  <th className="w-[88px] text-left">Vehicle</th>
                  <th className="w-[92px] text-left">Mode</th>
                  <th className="w-[80px] text-right">Kms / Hrs</th>
                  <th className="w-[72px] text-center">TA / Night</th>
                  <th className="w-[88px] text-right">Amount</th>
                  <th className="w-[92px] text-center">Status</th>
                  <th className="w-[48px] text-right">Action</th>
                </tr>
              </thead>
              <tbody>
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
                  const overridden = v != null && v.type !== t.car_type;
                  return (
                    <tr
                      key={t.id}
                      className={cn(
                        "border-b border-border last:border-b-0 hover:bg-muted/40 [&>td]:px-2.5 [&>td]:py-3 [&>td]:align-middle",
                        needsRate &&
                          "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
                      )}
                    >
                      <td className="whitespace-nowrap font-mono text-xs">
                        {fmtDate(t.date)}
                      </td>
                      <td className="truncate font-medium" title={c?.name}>
                        {c?.name ?? "-"}
                      </td>
                      <td className="truncate">
                        {v ? (
                          <span
                            className="inline-flex max-w-full items-center gap-1.5 font-mono text-xs"
                            title={
                              overridden
                                ? `Override: billed as ${t.car_type} (vehicle is actually ${v.type}).`
                                : undefined
                            }
                          >
                            <span className="truncate">
                              {v.number} · {t.car_type}
                            </span>
                            {overridden && (
                              <span
                                aria-hidden
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                              />
                            )}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {t.mode === "local" ? (
                          <Badge variant="outline">Local</Badge>
                        ) : (
                          <Badge variant="secondary">Outstation</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-right font-mono text-xs">
                        {t.total_kms}km
                        {t.mode === "local" ? ` / ${t.total_hours}hr` : ""}
                      </td>
                      <td className="whitespace-nowrap text-center text-xs">
                        {t.driver_ta > 0 && <span>TA×{t.driver_ta} </span>}
                        {t.night && <span>· night</span>}
                        {t.driver_ta === 0 && !t.night && "-"}
                      </td>
                      <td className="whitespace-nowrap text-right font-mono text-xs">
                        {needsRate ? (
                          <Link
                            href={`/rate-cards/new?client_id=${t.client_id}&car_type=${t.car_type}&mode=${t.mode}`}
                            className="font-medium text-primary hover:text-primary-hover"
                          >
                            Add rate
                          </Link>
                        ) : (
                          formatINR(amount)
                        )}
                      </td>
                      <td className="text-center">
                        {needsRate ? (
                          <Badge variant="warning">Needs rate</Badge>
                        ) : t.invoiced ? (
                          <Badge>Invoiced</Badge>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end">
                          <TripRowActions trip={t} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phone, below md. Each trip is a stacked card. The whole
              card opens the trip via a stretched link; the three dot
              menu sits above that link so it stays tappable. */}
          <div className="md:hidden flex flex-col gap-3">
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
              const overridden = v != null && v.type !== t.car_type;
              const clientName = c?.name ?? "-";
              const summary =
                `${t.total_kms}km` +
                (t.mode === "local" ? ` / ${t.total_hours}hr` : "") +
                (t.driver_ta > 0 ? ` · TA×${t.driver_ta}` : "") +
                (t.night ? " · night" : "");
              return (
                <div key={t.id} className="relative">
                  <div
                    className={cn(
                      "rounded-lg border border-border bg-card p-4",
                      needsRate &&
                        "border-amber-300 bg-amber-50/80 dark:border-amber-700/60 dark:bg-amber-950/30",
                    )}
                  >
                    {/* Line one: client and status, plus the menu. */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate font-medium">
                        {clientName}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        {needsRate ? (
                          <Badge variant="warning">Needs rate</Badge>
                        ) : t.invoiced ? (
                          <Badge>Invoiced</Badge>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                        <div className="relative z-10 -mr-1.5 -mt-1">
                          <TripRowActions trip={t} />
                        </div>
                      </div>
                    </div>

                    {/* Line two: date and vehicle. */}
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      {fmtDate(t.date)} · {v?.number ?? "-"} · {t.car_type}
                      {overridden && (
                        <span
                          aria-hidden
                          title={`Override: billed as ${t.car_type} (vehicle is actually ${v?.type}).`}
                          className="h-1.5 w-1.5 rounded-full bg-amber-500"
                        />
                      )}
                    </p>

                    {/* Line three: short summary and the amount. */}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {summary}
                      </span>
                      <span className="shrink-0 font-mono text-sm">
                        {needsRate ? (
                          <span className="text-xs text-muted-foreground">
                            Add rate
                          </span>
                        ) : (
                          formatINR(amount)
                        )}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/trips/${t.id}/edit`}
                    aria-label={`Open trip for ${clientName}`}
                    className="absolute inset-0 rounded-lg"
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
