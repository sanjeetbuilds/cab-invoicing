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
import type { Client, RateCard } from "@/lib/supabase/types";
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
        const list = byClient.get(c.id) ?? [];
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
                          <TableHead>Car</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead className="text-right">Base</TableHead>
                          <TableHead className="text-right">Base kms/hrs</TableHead>
                          <TableHead className="text-right">Extra km/hr</TableHead>
                          <TableHead className="text-right">Night</TableHead>
                          <TableHead className="text-right">Per km</TableHead>
                          <TableHead className="text-right">Driver TA</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.car_type}</TableCell>
                            <TableCell>
                              {r.mode === "local" ? (
                                <Badge variant="outline">Local</Badge>
                              ) : (
                                <Badge variant="secondary">Outstation</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{fmt(r.base_rate)}</TableCell>
                            <TableCell className="text-right">
                              {r.base_kms != null && r.base_hours != null
                                ? `${r.base_kms}km / ${r.base_hours}hr`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {r.extra_km != null || r.extra_hour != null
                                ? `${fmt(r.extra_km)} / ${fmt(r.extra_hour)}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">{fmt(r.night)}</TableCell>
                            <TableCell className="text-right">{fmt(r.per_km)}</TableCell>
                            <TableCell className="text-right">{fmt(r.driver_ta)}</TableCell>
                            <TableCell className="text-right">
                              <RateCardRowActions rateCard={r} clients={clientList} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden flex flex-col gap-3">
                    {list.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-md border p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {r.car_type}{" "}
                            <span className="text-xs text-muted-foreground font-normal">
                              · {r.mode}
                            </span>
                          </p>
                          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                            {r.mode === "local" ? (
                              <>
                                <p>
                                  Base {fmt(r.base_rate)} ·{" "}
                                  {r.base_kms}km/{r.base_hours}hr
                                </p>
                                <p>
                                  Extra {fmt(r.extra_km)}/km ·{" "}
                                  {fmt(r.extra_hour)}/hr · night {fmt(r.night)}
                                </p>
                              </>
                            ) : (
                              <p>{fmt(r.per_km)} / km</p>
                            )}
                            <p>Driver TA {fmt(r.driver_ta)}</p>
                          </div>
                        </div>
                        <RateCardRowActions rateCard={r} clients={clientList} />
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
