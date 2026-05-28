"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CarType,
  Client,
  Quotation,
  QuotationLine,
  QuotationStatus,
  TripMode,
} from "@/lib/supabase/types";
import {
  createQuotationAction,
  updateQuotationAction,
  type QuotationInput,
} from "./actions";

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];
const STATUSES: QuotationStatus[] = [
  "draft",
  "sent",
  "accepted",
  "expired",
  "rejected",
];

interface LineState {
  car_type: CarType;
  mode: TripMode;
  base_rate: string;
  base_kms: string;
  base_hours: string;
  extra_km: string;
  extra_hour: string;
  night: string;
  per_km: string;
  driver_ta: string;
}

function emptyLine(): LineState {
  return {
    car_type: "Dzire",
    mode: "local",
    base_rate: "1500",
    base_kms: "80",
    base_hours: "8",
    extra_km: "15",
    extra_hour: "100",
    night: "300",
    per_km: "",
    driver_ta: "300",
  };
}

function lineFromRow(l: QuotationLine): LineState {
  const s = (n: number | null | undefined) => (n == null ? "" : String(n));
  return {
    car_type: l.car_type,
    mode: l.mode,
    base_rate: s(l.base_rate),
    base_kms: s(l.base_kms),
    base_hours: s(l.base_hours),
    extra_km: s(l.extra_km),
    extra_hour: s(l.extra_hour),
    night: s(l.night),
    per_km: s(l.per_km),
    driver_ta: s(l.driver_ta),
  };
}

function n(s: string): number | null {
  if (!s.trim()) return null;
  const v = Number(s);
  return Number.isNaN(v) ? null : v;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export function QuotationForm({
  quotation,
  lines,
  clients,
}: {
  quotation?: Quotation | null;
  lines?: QuotationLine[];
  clients: Pick<Client, "id" | "name">[];
}) {
  const router = useRouter();
  const editing = !!quotation;
  const [pending, setPending] = useState(false);

  const [number, setNumber] = useState(quotation?.number ?? "");
  const [clientId, setClientId] = useState(quotation?.client_id ?? "");
  const [useNewClient, setUseNewClient] = useState(
    editing ? !quotation?.client_id : false,
  );
  const [clientName, setClientName] = useState(quotation?.client_name ?? "");
  const [clientAddress, setClientAddress] = useState(
    quotation?.client_address ?? "",
  );
  const [clientGstin, setClientGstin] = useState(quotation?.client_gstin ?? "");
  const [clientContact, setClientContact] = useState(
    quotation?.client_contact ?? "",
  );
  const [date, setDate] = useState(quotation?.date ?? todayIso());
  const [validUntil, setValidUntil] = useState(
    quotation?.valid_until ?? plusDays(90),
  );
  const [status, setStatus] = useState<QuotationStatus>(
    quotation?.status ?? "draft",
  );
  const [notes, setNotes] = useState(quotation?.notes ?? "");
  const [lineStates, setLineStates] = useState<LineState[]>(
    lines && lines.length > 0 ? lines.map(lineFromRow) : [emptyLine()],
  );

  function updateLine(i: number, patch: Partial<LineState>) {
    setLineStates((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    );
  }
  function addLine() {
    setLineStates((prev) => [...prev, emptyLine()]);
  }
  function removeLine(i: number) {
    setLineStates((prev) =>
      prev.length === 1 ? [emptyLine()] : prev.filter((_, idx) => idx !== i),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);

    const payload: QuotationInput = {
      number: number.trim(),
      client_id: useNewClient ? null : clientId || null,
      client_name: useNewClient ? clientName : "",
      client_address: useNewClient ? clientAddress : "",
      client_gstin: useNewClient ? clientGstin : "",
      client_contact: useNewClient ? clientContact : "",
      date,
      valid_until: validUntil,
      status,
      notes,
      lines: lineStates.map((l) => ({
        car_type: l.car_type,
        mode: l.mode,
        base_rate: l.mode === "local" ? n(l.base_rate) : null,
        base_kms: l.mode === "local" ? (n(l.base_kms) as number | null) : null,
        base_hours:
          l.mode === "local" ? (n(l.base_hours) as number | null) : null,
        extra_km: l.mode === "local" ? n(l.extra_km) : null,
        extra_hour: l.mode === "local" ? n(l.extra_hour) : null,
        night: l.mode === "local" ? n(l.night) : null,
        per_km: l.mode === "outstation" ? n(l.per_km) : null,
        driver_ta: n(l.driver_ta),
      })),
    };

    const result = editing
      ? await updateQuotationAction(quotation!.id, payload)
      : await createQuotationAction(payload);

    if (result.ok) {
      toast.success(editing ? "Quotation saved." : "Quotation created.");
      router.push(`/quotations/${result.id}`);
      router.refresh();
    } else {
      toast.error(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Card>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-number">Number</Label>
            <Input
              id="q-number"
              placeholder="Auto-allocate"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to auto-allocate from the company prefix.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-date">Date *</Label>
            <Input
              id="q-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-valid">Valid until</Label>
            <Input
              id="q-valid"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Client</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setUseNewClient(false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  !useNewClient
                    ? "bg-accent-soft text-accent-foreground border-accent-soft"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                Existing client
              </button>
              <button
                type="button"
                onClick={() => setUseNewClient(true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  useNewClient
                    ? "bg-accent-soft text-accent-foreground border-accent-soft"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                New client (create on accept)
              </button>
            </div>
          </div>

          {!useNewClient ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="q-client">Pick a client</Label>
              <Select
                value={clientId || undefined}
                onValueChange={(v) => {
                  if (typeof v === "string") setClientId(v);
                }}
              >
                <SelectTrigger id="q-client">
                  <SelectValue placeholder="Pick a client">
                    {(value) =>
                      typeof value === "string" && value
                        ? (clients.find((c) => c.id === value)?.name ?? null)
                        : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 flex flex-col gap-2">
                <Label htmlFor="q-cn">Client name *</Label>
                <Input
                  id="q-cn"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-cg">GSTIN</Label>
                <Input
                  id="q-cg"
                  value={clientGstin}
                  onChange={(e) => setClientGstin(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-cc">Contact person</Label>
                <Input
                  id="q-cc"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-2">
                <Label htmlFor="q-ca">Address</Label>
                <Textarea
                  id="q-ca"
                  rows={2}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate lines */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-foreground">Rate lines</p>
            <p className="text-xs text-muted-foreground">
              One row per (car type × mode). These become rate cards on accept.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addLine}>
            <Plus className="h-4 w-4" />
            Add line
          </Button>
        </div>

        {lineStates.map((l, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Car type</Label>
                  <Select
                    value={l.car_type}
                    onValueChange={(v) => {
                      if (typeof v === "string") {
                        updateLine(i, { car_type: v as CarType });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAR_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label className="text-xs">Mode</Label>
                  <Select
                    value={l.mode}
                    onValueChange={(v) => {
                      if (v === "local" || v === "outstation") {
                        updateLine(i, { mode: v });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local (base + extras)</SelectItem>
                      <SelectItem value="outstation">Outstation (per km)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {l.mode === "local" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field
                    label="Base rate ₹"
                    value={l.base_rate}
                    onChange={(v) => updateLine(i, { base_rate: v })}
                  />
                  <Field
                    label="Base kms"
                    value={l.base_kms}
                    onChange={(v) => updateLine(i, { base_kms: v })}
                  />
                  <Field
                    label="Base hours"
                    value={l.base_hours}
                    onChange={(v) => updateLine(i, { base_hours: v })}
                  />
                  <Field
                    label="Extra km ₹"
                    value={l.extra_km}
                    onChange={(v) => updateLine(i, { extra_km: v })}
                  />
                  <Field
                    label="Extra hour ₹"
                    value={l.extra_hour}
                    onChange={(v) => updateLine(i, { extra_hour: v })}
                  />
                  <Field
                    label="Night ₹"
                    value={l.night}
                    onChange={(v) => updateLine(i, { night: v })}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Per km ₹"
                    value={l.per_km}
                    onChange={(v) => updateLine(i, { per_km: v })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Driver TA ₹ / day"
                  value={l.driver_ta}
                  onChange={(v) => updateLine(i, { driver_ta: v })}
                />
                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(i)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    Remove line
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="q-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                if (typeof v === "string") setStatus(v as QuotationStatus);
              }}
            >
              <SelectTrigger id="q-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex flex-col gap-2">
            <Label htmlFor="q-notes">Notes</Label>
            <Textarea
              id="q-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/quotations")}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Save changes" : "Create quotation"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
