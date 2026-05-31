"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveBar, SaveBarSpacer } from "@/components/shell/save-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type {
  Client,
  Company,
  RateCard,
  Trip,
  Vehicle,
} from "@/lib/supabase/types";
import { tripToLines, tripTotal } from "@/lib/trip-lines";
import { buildInvoiceDraft } from "@/lib/invoice-builder";
import { issueInvoiceAction } from "../actions";

import { formatINR } from "@/lib/format";

const fmtTripDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
};

const tripCharge = (t: Trip) =>
  (t.extra_charge_amount && t.extra_charge_amount > 0)
    ? t.extra_charge_amount
    : (t.toll ?? 0);

const todayIso = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export function InvoiceBuilderForm({
  client,
  company,
  trips,
  rateCards,
  vehicles,
}: {
  client: Client;
  company: Company;
  trips: Trip[];
  rateCards: RateCard[];
  vehicles: Pick<Vehicle, "id" | "number" | "type">[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const sortedDates = trips.map((t) => t.date).sort();
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [periodFrom, setPeriodFrom] = useState(sortedDates[0] ?? todayIso());
  const [periodTo, setPeriodTo] = useState(
    sortedDates[sortedDates.length - 1] ?? todayIso(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(trips.map((t) => t.id)),
  );
  const [tollOverrideStr, setTollOverrideStr] = useState("");

  const rateByKey = useMemo(() => {
    const m = new Map<string, RateCard>();
    for (const r of rateCards) m.set(`${r.client_id}|${r.car_type}|${r.mode}`, r);
    return m;
  }, [rateCards]);

  const vehicleById = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles],
  );

  const selectedTrips = useMemo(
    () => trips.filter((t) => selectedIds.has(t.id)),
    [trips, selectedIds],
  );

  const tollOverride = (() => {
    if (tollOverrideStr.trim() === "") return null;
    const n = Number(tollOverrideStr);
    return Number.isFinite(n) ? n : null;
  })();

  const draft = useMemo(
    () =>
      buildInvoiceDraft({
        trips: selectedTrips,
        rateCards,
        vehicles,
        client,
        company,
        toll_override: tollOverride,
      }),
    [selectedTrips, rateCards, vehicles, client, company, tollOverride],
  );

  const hasMissingRate = draft.unmatched_trip_ids.length > 0;

  function toggleTrip(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === trips.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(trips.map((t) => t.id)));
  }

  async function onIssue() {
    if (selectedTrips.length === 0) {
      toast.error("Pick at least one trip.");
      return;
    }
    if (hasMissingRate) {
      toast.error("Add rate cards for the flagged trips first.");
      return;
    }
    setPending(true);
    const result = await issueInvoiceAction({
      client_id: client.id,
      invoice_date: invoiceDate,
      period_from: periodFrom,
      period_to: periodTo,
      trip_ids: selectedTrips.map((t) => t.id),
      toll_override: tollOverride,
    });
    setPending(false);

    if (result.ok) {
      toast.success(`Invoice #${result.invoice_number} issued.`);
      // Land on the in-shell PDF viewer so the user can preview /
      // share without leaving the app.
      router.push(`/invoices/${result.invoice_id}`);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Left: trip checklist + form */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invoice_date">Invoice date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="period_from">Period from</Label>
              <Input
                id="period_from"
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="period_to">Period to</Label>
              <Input
                id="period_to"
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">
              Trips ({selectedTrips.length} of {trips.length})
            </CardTitle>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs underline text-muted-foreground hover:text-foreground"
            >
              {selectedIds.size === trips.length ? "Untick all" : "Tick all"}
            </button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {trips.length === 0 ? (
              <p className="text-sm text-muted-foreground">No uninvoiced trips.</p>
            ) : (
              trips.map((t) => {
                const veh = vehicleById.get(t.vehicle_id);
                const effectiveMethod =
                  t.mode === "local"
                    ? "slab"
                    : (t.billing_method ?? "per_km");
                const lookupMode = effectiveMethod === "slab" ? "local" : "outstation";
                const rate = rateByKey.get(`${t.client_id}|${t.car_type}|${lookupMode}`);
                const amount = rate
                  ? tripTotal(
                      tripToLines(
                        {
                          car_type: t.car_type,
                          mode: t.mode,
                          billing_method: effectiveMethod,
                          total_kms: t.total_kms,
                          total_hours: t.total_hours,
                          night: t.night,
                          night_count: t.night_count ?? (t.night ? 1 : 0),
                          driver_ta: t.driver_ta,
                        },
                        rate,
                      ),
                    )
                  : null;
                const checked = selectedIds.has(t.id);

                return (
                  <label
                    key={t.id}
                    className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTrip(t.id)}
                      className="mt-1 h-4 w-4 accent-foreground"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-sm">
                          {fmtTripDate(t.date)}
                        </span>
                        <span className="font-mono text-sm">
                          {amount == null ? (
                            <span className="text-destructive">no rate</span>
                          ) : (
                            formatINR(amount)
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {veh?.number ?? "—"} · {t.car_type} ·{" "}
                        {t.mode === "local"
                          ? `${t.total_kms}km / ${t.total_hours}hr`
                          : `${t.total_kms}km outstation`}
                        {t.driver_ta > 0 ? ` · TA×${t.driver_ta}` : ""}
                        {t.night ? " · night" : ""}
                        {tripCharge(t) > 0 ? ` · charges ${formatINR(tripCharge(t))}` : ""}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Toll</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Label htmlFor="toll_override" className="text-xs">
              Override sum of trip tolls (optional)
            </Label>
            <Input
              id="toll_override"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder={`Default: ${formatINR(
                selectedTrips.reduce((s, t) => s + tripCharge(t), 0),
              )}`}
              value={tollOverrideStr}
              onChange={(e) => setTollOverrideStr(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tolls aren&apos;t taxed — they&apos;re added separately to the invoice net.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right: live preview + issue button */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-4 self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="Subtotal" value={formatINR(draft.subtotal)} />

            {draft.gst.mode === "RCM" && (
              <p className="text-xs text-muted-foreground">
                RCM — no GST charged on this invoice.
              </p>
            )}
            {draft.gst.mode === "CGST_SGST" && (
              <>
                <Row label={draft.gst.labels.cgst ?? "CGST"} value={formatINR(draft.gst.cgst)} />
                <Row label={draft.gst.labels.sgst ?? "SGST"} value={formatINR(draft.gst.sgst)} />
              </>
            )}
            {draft.gst.mode === "IGST" && (
              <Row label={draft.gst.labels.igst ?? "IGST"} value={formatINR(draft.gst.igst)} />
            )}

            <Row label={draft.toll_label} value={formatINR(draft.toll_total)} />

            <div className="border-t pt-2 flex justify-between text-base font-medium">
              <span>Net</span>
              <span className="font-mono">{formatINR(draft.net_amount)}</span>
            </div>

            <p className="text-xs text-muted-foreground italic">
              {draft.amount_in_words}
            </p>

            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline">{draft.gst.mode}</Badge>
              {client.is_rcm && <Badge variant="secondary">RCM client</Badge>}
              {client.state !== company.state && (
                <Badge variant="outline">{client.state}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {hasMissingRate && (
          <Card className="border-destructive">
            <CardContent className="py-4 text-sm text-destructive">
              {draft.unmatched_trip_ids.length} trip(s) have no rate card.
              They won&apos;t be on the invoice. Untick them or add the missing
              rate cards.
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Issuing reserves the next invoice number for {client.name}.
          Use the Issue invoice button at the bottom of the screen.
        </p>
      </div>
      <SaveBarSpacer />
      <SaveBar
        onSave={onIssue}
        pending={pending}
        canSave={selectedTrips.length > 0 && !hasMissingRate}
        onCancel={() => router.push("/trips")}
        saveLabel="Issue invoice"
        savingLabel="Issuing..."
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
