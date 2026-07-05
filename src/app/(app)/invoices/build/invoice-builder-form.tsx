"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveBar, SaveBarSpacer } from "@/components/shell/save-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Client,
  Company,
  RateCard,
  Trip,
  Vehicle,
} from "@/lib/supabase/types";
import { tripToLines, tripTotal } from "@/lib/trip-lines";
import { buildInvoiceDraft } from "@/lib/invoice-builder";
import { chargeLabel } from "@/lib/charges";
import { numberToWords } from "@/lib/number-to-words";
import { issueInvoiceAction, saveDraftInvoiceAction } from "../actions";

import { formatINR } from "@/lib/format";

const round2 = (n: number) => Math.round(n * 100) / 100;

const fmtTripDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
};

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
  nextNumber,
  freedNumbers,
  prefix,
}: {
  client: Client;
  company: Company;
  trips: Trip[];
  rateCards: RateCard[];
  vehicles: Pick<Vehicle, "id" | "number" | "type">[];
  /** Next sequential invoice number for this company. */
  nextNumber: number;
  /** Freed numbers from deleted invoices, lowest first, free to reuse. */
  freedNumbers: number[];
  /** Invoice number prefix, for display only. */
  prefix: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  // The number to assign. Default to the lowest available: the lowest freed
  // number if any, otherwise the next sequential number. The value is a
  // string for the Select; convert to a number on save.
  const defaultNumber = freedNumbers[0] ?? nextNumber;
  const [chosenNumber, setChosenNumber] = useState<string>(String(defaultNumber));

  const sortedDates = trips.map((t) => t.date).sort();
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [periodFrom, setPeriodFrom] = useState(sortedDates[0] ?? todayIso());
  const [periodTo, setPeriodTo] = useState(
    sortedDates[sortedDates.length - 1] ?? todayIso(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(trips.map((t) => t.id)),
  );
  // Reimbursement charges entered here, added after GST on the invoice.
  // Seeded from the last charges recorded for this client (persisted on the
  // client on every issue/draft) so a rebuild after delete — or simply next
  // month's invoice — starts pre-filled instead of blank. Fully editable.
  const lastAmount = Number(client.last_charge_amount ?? 0);
  const [chargeAmountStr, setChargeAmountStr] = useState(
    lastAmount > 0 ? String(lastAmount) : "",
  );
  const [chargeToll, setChargeToll] = useState(Boolean(client.last_charge_toll));
  const [chargeTax, setChargeTax] = useState(Boolean(client.last_charge_tax));
  const [chargeParking, setChargeParking] = useState(
    Boolean(client.last_charge_parking),
  );

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

  // The client-side draft only feeds the missing-rate guard, so charges
  // (which never affect rate matching) are left out to avoid recomputing
  // on every keystroke in the charges box.
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

  // Live totals for the summary. The draft above is built without charges
  // (it only feeds the rate guard). Charges never touch the subtotal or
  // GST, they add one untaxed line after GST, so we layer them on here
  // with the exact same arithmetic buildInvoiceDraft uses on issue. This
  // keeps the preview matching the issued invoice to the paisa without
  // rebuilding every line on each charges keystroke.
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
      charges,
      requested_number: Number(chosenNumber),
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

  async function onSaveDraft() {
    if (selectedTrips.length === 0) {
      toast.error("Pick at least one trip.");
      return;
    }
    if (hasMissingRate) {
      toast.error("Add rate cards for the flagged trips first.");
      return;
    }
    setSavingDraft(true);
    const result = await saveDraftInvoiceAction({
      client_id: client.id,
      invoice_date: invoiceDate,
      period_from: periodFrom,
      period_to: periodTo,
      trip_ids: selectedTrips.map((t) => t.id),
      charges,
      requested_number: Number(chosenNumber),
    });
    setSavingDraft(false);

    if (result.ok) {
      toast.success(`Draft #${result.invoice_number} saved.`);
      // Drafts live in the invoices list, where they can be issued or
      // deleted. Send the user there to find it.
      router.push("/invoices");
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
              <p className="text-sm text-muted-foreground">No trips waiting to be billed.</p>
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
              {lastAmount > 0 && (
                <>
                  {" "}
                  Pre-filled from {client.name}&apos;s last invoice — edit or
                  clear it for this month.
                </>
              )}
            </p>
          </CardContent>
        </Card>

        </div>

        {/* Right: live total, invoice number, warnings, help. Sticky on desktop. */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4 self-start">
        {/* Live total. Mirrors the issued-invoice arithmetic exactly:
            trip subtotal, GST, then charges added untaxed. */}
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

        {/* Invoice number picker. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice number</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Select value={chosenNumber} onValueChange={(v) => {
              if (typeof v === "string") setChosenNumber(v);
            }}>
              <SelectTrigger id="invoice_number">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {freedNumbers.map((n) => (
                  <SelectItem key={`freed-${n}`} value={String(n)}>
                    {prefix}{n} (reuse freed)
                  </SelectItem>
                ))}
                <SelectItem value={String(nextNumber)}>
                  {prefix}{nextNumber} (next new)
                </SelectItem>
              </SelectContent>
            </Select>
            {freedNumbers.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Freed numbers from deleted invoices can be used again. The
                lowest free number is picked by default.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                The next number in your series.
              </p>
            )}
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
          Issuing reserves an invoice number for {client.name}. Use the Issue
          invoice button at the bottom of the screen.
        </p>
        </div>
      </div>
      <SaveBarSpacer />
      <SaveBar
        onSave={onIssue}
        pending={pending}
        canSave={selectedTrips.length > 0 && !hasMissingRate}
        onCancel={() => router.push("/trips")}
        saveLabel="Issue invoice"
        savingLabel="Issuing..."
        secondaryLabel="Save as draft"
        onSecondary={onSaveDraft}
        secondaryPending={savingDraft}
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
