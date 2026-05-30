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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Client, RateCard, TripMode } from "@/lib/supabase/types";

const MODE_ORDER: TripMode[] = ["local", "outstation", "transfer", "package"];
const MODE_LABELS: Record<TripMode, string> = {
  local: "Local",
  outstation: "Outstation",
  transfer: "Transfer",
  package: "Package",
};
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { AddRateCardButton } from "./add-rate-card-button";
import { RateCardRowActions } from "./rate-card-row-actions";

export const metadata = { title: "Rate cards" };

function fmt(n: number | null) {
  return n == null ? "—" : formatINR(n);
}

export default async function RateCardsPage() {
  const { supabase, membership } = await requireMembership();

  const [{ data: clients }, { data: cards }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
    supabase
      .from("rate_cards")
      .select("*")
      .eq("company_id", membership.company_id)
      .order("car_type", { ascending: true })
      .returns<RateCard[]>(),
  ]);

  const clientList = clients ?? [];
  const cardList = cards ?? [];
  const byClient = new Map<string, RateCard[]>();
  for (const card of cardList) {
    const list = byClient.get(card.client_id) ?? [];
    list.push(card);
    byClient.set(card.client_id, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rate cards"
        description="Per-client pricing. Updated when you accept a new quotation."
      >
        <AddRateCardButton clients={clientList} />
      </PageHeader>

      {clientList.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Add{" "}
            <Link href="/clients" className="underline">
              clients
            </Link>{" "}
            first — rate cards live under a client.
          </CardContent>
        </Card>
      )}

      {clientList.map((c) => {
        const unsorted = byClient.get(c.id) ?? [];
        // Group cards by mode in fixed order so Local → Outstation →
        // Transfer → Package render top to bottom; within Transfer /
        // Package, sort by plan_name so plans line up alphabetically.
        const list = unsorted.slice().sort((a, b) => {
          const aOrder = MODE_ORDER.indexOf(a.mode);
          const bOrder = MODE_ORDER.indexOf(b.mode);
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a.plan_name ?? "").localeCompare(b.plan_name ?? "");
        });
        return (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{c.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {list.length} rate{list.length === 1 ? "" : "s"}
                </p>
              </div>
              <AddRateCardButton
                clients={clientList}
                defaultClientId={c.id}
                label="Add for this client"
                variant="outline"
                size="sm"
              />
            </CardHeader>
            <CardContent>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rates yet.</p>
              ) : (
                <>
                  <div className="hidden md:block rounded-md border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Car · Mode · Plan</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Driver TA</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{r.car_type}</span>
                                <Badge variant="outline">
                                  {MODE_LABELS[r.mode]}
                                </Badge>
                                {r.plan_name && (
                                  <span className="text-foreground/80 font-normal">
                                    · {r.plan_name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {r.mode === "local" && (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="font-mono">
                                    Base {fmt(r.base_rate)} · {r.base_kms ?? "—"}km/
                                    {r.base_hours ?? "—"}hr
                                  </span>
                                  <span className="font-mono text-muted-foreground">
                                    +{fmt(r.extra_km)}/km · +{fmt(r.extra_hour)}/hr ·
                                    night {fmt(r.night)}
                                  </span>
                                </div>
                              )}
                              {r.mode === "outstation" && (
                                <span className="font-mono">{fmt(r.per_km)} / km</span>
                              )}
                              {(r.mode === "transfer" || r.mode === "package") && (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="font-mono font-medium">
                                    {fmt(r.fixed_price)} fixed
                                  </span>
                                  {r.mode === "package" &&
                                    (r.includes_toll ||
                                      r.includes_tax ||
                                      r.includes_parking) && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Includes{" "}
                                        {[
                                          r.includes_toll && "toll",
                                          r.includes_tax && "tax",
                                          r.includes_parking && "parking",
                                        ]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </span>
                                    )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {fmt(r.driver_ta)}
                            </TableCell>
                            <TableCell className="text-right">
                              <RateCardRowActions rateCard={r} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden flex flex-col gap-2">
                    {list.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-md border p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium flex items-center gap-2 flex-wrap">
                            {r.car_type}
                            <Badge variant="outline" className="text-[10px]">
                              {MODE_LABELS[r.mode]}
                            </Badge>
                          </p>
                          {r.plan_name && (
                            <p className="text-xs font-medium text-foreground/80 mt-0.5">
                              {r.plan_name}
                            </p>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                            {r.mode === "local" && (
                              <>
                                <p>
                                  Base {fmt(r.base_rate)} · {r.base_kms}km/
                                  {r.base_hours}hr
                                </p>
                                <p>
                                  Extra {fmt(r.extra_km)}/km ·{" "}
                                  {fmt(r.extra_hour)}/hr · night {fmt(r.night)}
                                </p>
                              </>
                            )}
                            {r.mode === "outstation" && (
                              <p>{fmt(r.per_km)} / km</p>
                            )}
                            {(r.mode === "transfer" || r.mode === "package") && (
                              <p>
                                <span className="font-medium text-foreground">
                                  {fmt(r.fixed_price)} fixed
                                </span>
                                {r.mode === "package" &&
                                  (r.includes_toll ||
                                    r.includes_tax ||
                                    r.includes_parking) && (
                                    <>
                                      {" · includes "}
                                      {[
                                        r.includes_toll && "toll",
                                        r.includes_tax && "tax",
                                        r.includes_parking && "parking",
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </>
                                  )}
                              </p>
                            )}
                            <p>Driver TA {fmt(r.driver_ta)}</p>
                          </div>
                        </div>
                        <RateCardRowActions rateCard={r} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
