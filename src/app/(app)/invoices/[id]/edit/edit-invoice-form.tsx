"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveBar, SaveBarSpacer } from "@/components/shell/save-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  Client,
  Company,
  Invoice,
  RateCard,
  Trip,
  Vehicle,
} from "@/lib/supabase/types";
import { tripToLines, tripTotal } from "@/lib/trip-lines";
import { buildInvoiceDraft } from "@/lib/invoice-builder";
import { chargeLabel } from "@/lib/charges";
import { numberToWords } from "@/lib/number-to-words";
import { updateInvoiceAction } from "../../actions";

import { formatINR } from "@/lib/format";

const round2 = (n: number) => Math.round(n * 100) / 100;

const fmtTripDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
};

/** Recover the ticked charge boxes from the stored label text. The label
 *  is composed from these same words, so a substring test round-trips it. */
function parseChargeLabel(label: string | null): {
  toll: boolean;
  tax: boolean;
  parking: boolean;
} {
  const l = label ?? "";
  return {
    toll: /\btoll\b/i.test(l),
    tax: /\btax\b/i.test(l),
    parking: /\bparking\b/i.test(l),
  };
}

export function EditInvoiceForm({
  invoice,
  client,
  company,
  trips,
  selectedTripIds,
  rateCards,
  vehicles,
  prefix,
}: {
  invoice: Invoice;
  client: Client;
  company: Company;
  /** Trips originally on this invoice plus any currently uninvoiced trips
   *  for this client, so the user can add or drop trips while editing. */
  trips: Trip[];
  /** Trip ids that were on the invoice before this edit; pre-ticked. */
  selectedTripIds: string[];
  rateCards: RateCard[];
  vehicles: Pick<Vehicle, "id" | "number" | "type">[];
  prefix: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const fullNumber = `${prefix}${invoice.invoice_number}`;
  const viewUrl = `/invoices/${invoice.id}`;

  const [invoiceDate, setInvoiceDate] = useState(invoice.invoice_date);
  const [periodFrom, setPeriodFrom] = useState(invoice.period_from ?? invoice.invoice_date);
  const [periodTo, setPeriodTo] = useState(invoice.period_to ?? invoice.invoice_date);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(selectedTripIds),
  );

  const initialFlags = parseChargeLabel(invoice.toll_label);
  const [chargeAmountStr, setChargeAmountStr] = useState(
    invoice.toll_total > 0 ? String(invoice.toll_total) : "",
  );
  const [chargeToll, setChargeToll] = useState(initialFlags.toll);
  const [chargeTax, setChargeTax] = useState(initialFlags.tax);
  const [chargeParking, setChargeParking] = useState(initialFlags.parking);

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

  const chargeAmount = (() => {
    const n = Number(chargeAmountStr);
    return chargeAmountStr.trim() !== "" && Number.isFinite(n) ? n : 0;
  })();
  const charges = {
    amount: chargeAmount,
    toll: chargeToll,
    tax: chargeTax,
    parking: chargeParking,
  };

  const draft = useMemo(
    () =>
      buildInvoiceDraft({
        trips: selectedTrips,
        rateCards,
        vehicles,
        client,
        company,
      }),
    [selectedTrips, rateCards, vehicles, client, company],
  );

  const hasMissingRate = draft.unmatched_trip_ids.length > 0;

  const tollTotal = round2(chargeAmount);
  const tollLabel = chargeLabel(
    { toll: chargeToll, tax: chargeTax, parking: chargeParking },
    tollTotal,
  );
  const netAmount = round2(
    draft.subtotal +
      draft.gst.cgst +
      draft.gst.sgst +
      draft.gst.igst +
      tollTotal,
  );
  const amountInWords = `${numberToWords(Math.round(netAmount))} Only.`;

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

  async function onSave() {
    if (selectedTrips.length === 0) {
      toast.error("Pick at least one trip.");
      return;
    }
    if (hasMissingRate) {
      toast.error("Add rate cards for the flagged trips first.");
      return;
    }
    setPending(true);
    const result = await updateInvoiceAction({
      id: invoice.id,
      invoice_date: invoiceDate,
      period_from: periodFrom,
      period_to: periodTo,
      trip_ids: selectedTrips.map((t) => t.id),
      charges,
    });
    setPending(false);

    if (result.ok) {
      toast.success(`Invoice ${fullNumber} updated.`);
      router.push(viewUrl);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: invoice details, trip checklist, charges */}
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
              <p className="text-sm text-muted-foreground">No trips available.</p>
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
                        {veh?.number ?? "-"} · {t.car_type} ·{" "}
                        {t.mode === "local"
                          ? `${t.total_kms}km / ${t.total_hours}hr`
                          : `${t.total_kms}km outstation`}
                        {t.driver_ta > 0 ? ` · TA×${t.driver_ta}` : ""}
                        {t.night ? " · night" : ""}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Charges (toll, parking, any other). Added after GST as a
            reimbursement line, not taxed. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Charges</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="charge_amount" className="text-xs">
                Amount (toll, parking, other)
              </Label>
              <Input
                id="charge_amount"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0.00"
                value={chargeAmountStr}
                onChange={(e) => setChargeAmountStr(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <ChargeCheckbox id="bc_toll" checked={chargeToll} onChange={setChargeToll} label="Toll" />
              <ChargeCheckbox id="bc_tax" checked={chargeTax} onChange={setChargeTax} label="Tax" />
              <ChargeCheckbox id="bc_parking" checked={chargeParking} onChange={setChargeParking} label="Parking" />
            </div>
            <p className="text-xs text-muted-foreground">
              Added to the invoice net after GST. Tick the boxes to label what
              it covers. Leave the amount blank for no charges.
            </p>
          </CardContent>
        </Card>

        </div>

        {/* Right: live total, warnings. Sticky on desktop. */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4 self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Subtotal" value={formatINR(draft.subtotal)} />

            {draft.gst.mode === "RCM" && (
              <p className="text-xs text-muted-foreground">
                RCM, no GST charged on this invoice.
              </p>
            )}
            {draft.gst.mode === "CGST_SGST" && (
              <>
                <Row
                  label={draft.gst.labels.cgst ?? "CGST"}
                  value={formatINR(draft.gst.cgst)}
                />
                <Row
                  label={draft.gst.labels.sgst ?? "SGST"}
                  value={formatINR(draft.gst.sgst)}
                />
              </>
            )}
            {draft.gst.mode === "IGST" && (
              <Row
                label={draft.gst.labels.igst ?? "IGST"}
                value={formatINR(draft.gst.igst)}
              />
            )}

            {tollTotal > 0 && (
              <Row label={tollLabel} value={formatINR(tollTotal)} />
            )}

            <div className="border-t pt-2 flex justify-between text-base font-medium">
              <span>Net amount</span>
              <span className="font-mono">{formatINR(netAmount)}</span>
            </div>

            <p className="text-xs text-muted-foreground italic">
              {amountInWords}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice number</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono">{fullNumber}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Fixed — editing doesn&apos;t change the invoice number or status.
            </p>
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
        </div>
      </div>
      <SaveBarSpacer />
      <SaveBar
        onSave={onSave}
        pending={pending}
        canSave={selectedTrips.length > 0 && !hasMissingRate}
        onCancel={() => router.push(viewUrl)}
        saveLabel="Save changes"
        savingLabel="Saving..."
      />
    </div>
  );
}

function ChargeCheckbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
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
