"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { VehiclePicker } from "@/components/pickers/vehicle-picker";
import { InlineVehicleForm } from "../../trips/inline-vehicle-form";
import { tripToLines, tripTotal } from "@/lib/trip-lines";
import { chargeLabel } from "@/lib/charges";
import { gstFor } from "@/lib/gst";
import { numberToWords } from "@/lib/number-to-words";
import { formatINR } from "@/lib/format";
import { INDIA_STATES } from "@/lib/india-states";
import type {
  CarType,
  Client,
  RateCard,
  TripMode,
  Vehicle,
} from "@/lib/supabase/types";
import { issueQuickInvoiceAction } from "./actions";

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];
const MODES: TripMode[] = ["local", "outstation", "transfer", "package"];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toNum(s: string): number {
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}

function toNumOrNull(s: string): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function modeLabel(m: TripMode): string {
  switch (m) {
    case "local": return "Local (kms + hours)";
    case "outstation": return "Outstation (per km)";
    case "transfer": return "Transfer (fixed price)";
    case "package": return "Package (fixed price)";
  }
}

type QuickCustomerLite = Pick<
  Client,
  | "id"
  | "name"
  | "state"
  | "gstin"
  | "address"
  | "is_rcm"
  | "default_booked_by"
>;

export function QuickInvoiceForm({
  vehicles,
  quickCustomers,
  companyState,
}: {
  vehicles: Pick<Vehicle, "id" | "number" | "type" | "active">[];
  quickCustomers: QuickCustomerLite[];
  companyState: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [localVehicles, setLocalVehicles] = useState(vehicles);
  const [addingVehicle, setAddingVehicle] = useState<null | string>(null);

  // Customer
  const [existingId, setExistingId] = useState<string | "">("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState(companyState);
  const [isRcm, setIsRcm] = useState(false);

  // Trip
  const [date, setDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [carType, setCarType] = useState<CarType>("Dzire");
  const [mode, setMode] = useState<TripMode>("local");
  const [planName, setPlanName] = useState("");
  const [totalKms, setTotalKms] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [nightCount, setNightCount] = useState("0");
  const [driverTaDays, setDriverTaDays] = useState("0");

  // Rates (typed inline, no rate-card lookup)
  const [baseRate, setBaseRate] = useState("");
  const [baseKms, setBaseKms] = useState("80");
  const [baseHours, setBaseHours] = useState("8");
  const [extraKm, setExtraKm] = useState("");
  const [extraHour, setExtraHour] = useState("");
  const [night, setNight] = useState("");
  const [perKm, setPerKm] = useState("");
  const [fixedPrice, setFixedPrice] = useState("");
  const [driverTaRate, setDriverTaRate] = useState("300");
  const [includesToll, setIncludesToll] = useState(false);
  const [includesTax, setIncludesTax] = useState(false);
  const [includesParking, setIncludesParking] = useState(false);
  const [notes, setNotes] = useState("");

  // Extras
  const [extrasAmount, setExtrasAmount] = useState("0");
  const [chargeToll, setChargeToll] = useState(false);
  const [chargeTax, setChargeTax] = useState(false);
  const [chargeParking, setChargeParking] = useState(false);

  const isFixed = mode === "transfer" || mode === "package";

  // Autocomplete suggestions: existing quick customers whose name
  // starts with what the user has typed. Up to 5 to keep the panel
  // discreet.
  const suggestions = useMemo(() => {
    const needle = name.trim().toLowerCase();
    if (!needle) return [] as QuickCustomerLite[];
    if (existingId) return [] as QuickCustomerLite[];
    return quickCustomers
      .filter((c) => c.name.toLowerCase().includes(needle))
      .slice(0, 5);
  }, [name, existingId, quickCustomers]);

  function loadCustomer(c: QuickCustomerLite) {
    setExistingId(c.id);
    setName(c.name);
    setGstin(c.gstin ?? "");
    setAddress(c.address ?? "");
    setState(c.state);
    setIsRcm(c.is_rcm);
    // default_booked_by carries "phone · email" for quick customers.
    const dbb = (c.default_booked_by ?? "").trim();
    if (dbb) {
      const [p, e] = dbb.split(" · ");
      setPhone(p ?? "");
      setEmail(e ?? "");
    }
  }

  function clearCustomer() {
    setExistingId("");
    setName("");
    setPhone("");
    setEmail("");
    setGstin("");
    setAddress("");
  }

  // Live preview using a synthetic rate card built from the typed rates.
  const preview = useMemo(() => {
    const rate: RateCard = {
      id: "synthetic",
      company_id: "synthetic",
      client_id: "synthetic",
      car_type: carType,
      mode,
      base_rate: toNumOrNull(baseRate),
      base_kms: toNumOrNull(baseKms),
      base_hours: toNumOrNull(baseHours),
      extra_km: toNumOrNull(extraKm),
      extra_hour: toNumOrNull(extraHour),
      night: toNumOrNull(night),
      per_km: toNumOrNull(perKm),
      plan_name: planName.trim() || null,
      fixed_price: toNumOrNull(fixedPrice),
      includes_toll: includesToll,
      includes_tax: includesTax,
      includes_parking: includesParking,
      notes: notes.trim() || null,
      driver_ta: toNumOrNull(driverTaRate),
      source_quotation_id: null,
      active_from: date,
      created_at: date,
      updated_at: date,
    };
    const billing_method =
      mode === "outstation" ? "per_km" : "slab";
    const lines = tripToLines(
      {
        car_type: carType,
        mode,
        billing_method,
        total_kms: toNum(totalKms),
        total_hours: toNum(totalHours),
        night: toNum(nightCount) > 0,
        night_count: toNum(nightCount),
        driver_ta: Math.floor(toNum(driverTaDays)),
      },
      rate,
    );
    const subtotal = tripTotal(lines);
    const gst = gstFor(
      { state, is_rcm: isRcm },
      subtotal,
      { state: companyState },
    );
    const extras = toNum(extrasAmount);
    const net = Math.round((subtotal + gst.cgst + gst.sgst + gst.igst + extras) * 100) / 100;
    const inWords = subtotal > 0 ? `${numberToWords(Math.round(net))} Only.` : "";
    return { lines, subtotal, gst, extras, net, inWords };
  }, [
    carType,
    mode,
    baseRate,
    baseKms,
    baseHours,
    extraKm,
    extraHour,
    night,
    perKm,
    planName,
    fixedPrice,
    includesToll,
    includesTax,
    includesParking,
    notes,
    driverTaRate,
    totalKms,
    totalHours,
    nightCount,
    driverTaDays,
    state,
    isRcm,
    companyState,
    extrasAmount,
    date,
  ]);

  const liveExtrasLabel = chargeLabel(
    { toll: chargeToll, tax: chargeTax, parking: chargeParking },
    toNum(extrasAmount),
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!vehicleId) {
      toast.error("Pick a vehicle.");
      return;
    }
    if (preview.subtotal <= 0) {
      toast.error("Total amount must be greater than zero — check the rates.");
      return;
    }
    if (isFixed && !planName.trim()) {
      toast.error("Plan name is required for transfer / package trips.");
      return;
    }

    setPending(true);
    const result = await issueQuickInvoiceAction({
      customer: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstin: gstin.trim(),
        address: address.trim(),
        state,
        is_rcm: isRcm,
        existing_client_id: existingId || null,
      },
      trip: {
        date,
        end_date: endDate,
        vehicle_id: vehicleId,
        car_type: carType,
        mode,
        plan_name: planName.trim(),
        total_kms: toNum(totalKms),
        total_hours: toNum(totalHours),
        night_count: Math.floor(toNum(nightCount)),
        driver_ta: Math.floor(toNum(driverTaDays)),
        base_rate: toNumOrNull(baseRate),
        base_kms: toNumOrNull(baseKms),
        base_hours: toNumOrNull(baseHours),
        extra_km: toNumOrNull(extraKm),
        extra_hour: toNumOrNull(extraHour),
        night: toNumOrNull(night),
        per_km: toNumOrNull(perKm),
        fixed_price: toNumOrNull(fixedPrice),
        driver_ta_rate: toNumOrNull(driverTaRate),
        includes_toll: includesToll,
        includes_tax: includesTax,
        includes_parking: includesParking,
        notes: notes.trim(),
      },
      extras: {
        amount: toNum(extrasAmount),
        charge_toll: chargeToll,
        charge_tax: chargeTax,
        charge_parking: chargeParking,
      },
    });
    if (result.ok) {
      toast.success(`Invoice #${result.invoice_number} issued.`);
      window.open(`/api/invoices/${result.invoice_id}/pdf`, "_blank", "noopener");
      router.push("/invoices");
    } else {
      toast.error(result.error);
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start"
    >
      <div className="flex flex-col gap-4 min-w-0">
        {/* Section 1: Customer */}
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                Customer
              </p>
              {existingId && (
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear & start fresh
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 flex flex-col gap-1.5 relative">
                <Label htmlFor="q-name">Name *</Label>
                <Input
                  id="q-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (existingId) setExistingId("");
                  }}
                  placeholder="Mr. Suresh Kumar"
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-md border border-border bg-popover shadow-card-hover">
                    <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Past customers
                    </p>
                    {suggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => loadCustomer(c)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {c.state}
                          {c.gstin ? ` · ${c.gstin}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-phone">Phone</Label>
                <Input
                  id="q-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 …"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-email">Email</Label>
                <Input
                  id="q-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-gstin">GSTIN</Label>
                <Input
                  id="q-gstin"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-state">State *</Label>
                <Select
                  value={state}
                  onValueChange={(v) => typeof v === "string" && setState(v)}
                >
                  <SelectTrigger id="q-state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIA_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">RCM (reverse charge)</Label>
                <div className="flex h-9 items-center">
                  <Switch checked={isRcm} onCheckedChange={setIsRcm} />
                  <span className="ml-3 text-sm text-muted-foreground">
                    {isRcm ? "Yes — GST under RCM" : "No — charge GST"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-address">Address</Label>
              <Textarea
                id="q-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Optional billing address"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Trip */}
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Trip / Duty
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-date">Date *</Label>
                <Input
                  id="q-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-end">End date</Label>
                <Input
                  id="q-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-car">Car type *</Label>
                <Select
                  value={carType}
                  onValueChange={(v) =>
                    typeof v === "string" && setCarType(v as CarType)
                  }
                >
                  <SelectTrigger id="q-car">
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="q-mode">Mode *</Label>
                <Select
                  value={mode}
                  onValueChange={(v) =>
                    typeof v === "string" && setMode(v as TripMode)
                  }
                >
                  <SelectTrigger id="q-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {modeLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-vehicle">Vehicle *</Label>
              <VehiclePicker
                id="q-vehicle"
                vehicles={localVehicles}
                value={vehicleId}
                onValueChange={(v) => {
                  setVehicleId(v);
                  const veh = localVehicles.find((x) => x.id === v);
                  if (veh && CAR_TYPES.includes(veh.type)) {
                    setCarType(veh.type);
                  }
                }}
                onAddNew={(typed) => setAddingVehicle(typed)}
              />
            </div>

            {addingVehicle !== null && (
              <InlineVehicleForm
                defaultNumber={addingVehicle}
                defaultOwnership="attached"
                onCancel={() => setAddingVehicle(null)}
                onCreated={(v) => {
                  setLocalVehicles((prev) => [...prev, v]);
                  setVehicleId(v.id);
                  if (CAR_TYPES.includes(v.type)) setCarType(v.type);
                  setAddingVehicle(null);
                }}
              />
            )}

            {/* Mode-specific rate fields. Hidden on fixed-price modes; shown
                inline for local / outstation. */}
            {mode === "local" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Num label="Total kms *" value={totalKms} set={setTotalKms} />
                  <Num label="Total hrs" value={totalHours} set={setTotalHours} />
                  <Num label="Driver TA days" value={driverTaDays} set={setDriverTaDays} />
                  <Num label="Night charges (count)" value={nightCount} set={setNightCount} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Num label="Base rate ₹" value={baseRate} set={setBaseRate} />
                  <Num label="Base kms" value={baseKms} set={setBaseKms} />
                  <Num label="Base hours" value={baseHours} set={setBaseHours} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Num label="Extra km ₹" value={extraKm} set={setExtraKm} />
                  <Num label="Extra hour ₹" value={extraHour} set={setExtraHour} />
                  <Num label="Night ₹" value={night} set={setNight} />
                  <Num label="Driver TA ₹ / day" value={driverTaRate} set={setDriverTaRate} />
                </div>
              </>
            )}

            {mode === "outstation" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Num label="Total kms *" value={totalKms} set={setTotalKms} />
                  <Num label="Driver TA days" value={driverTaDays} set={setDriverTaDays} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Num label="Per km ₹ *" value={perKm} set={setPerKm} />
                  <Num label="Driver TA ₹ / day" value={driverTaRate} set={setDriverTaRate} />
                </div>
              </>
            )}

            {isFixed && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="q-plan" className="text-xs">Plan name *</Label>
                    <Input
                      id="q-plan"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder={
                        mode === "transfer"
                          ? "e.g. Airport T3 Drop"
                          : "e.g. Manali 3D2N"
                      }
                    />
                  </div>
                  <Num label="Fixed price ₹ *" value={fixedPrice} set={setFixedPrice} />
                  <Num label="Driver TA days" value={driverTaDays} set={setDriverTaDays} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Num label="Driver TA ₹ / day" value={driverTaRate} set={setDriverTaRate} />
                </div>
                {mode === "package" && (
                  <div className="flex flex-col gap-2 border-t border-border pt-3">
                    <Label className="text-xs">Price includes</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Check
                        id="q-itoll"
                        checked={includesToll}
                        onChange={setIncludesToll}
                        label="Toll"
                      />
                      <Check
                        id="q-itax"
                        checked={includesTax}
                        onChange={setIncludesTax}
                        label="Tax"
                      />
                      <Check
                        id="q-iparking"
                        checked={includesParking}
                        onChange={setIncludesParking}
                        label="Parking"
                      />
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="q-notes" className="text-xs">Notes</Label>
                  <Textarea
                    id="q-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Toll / Tax / Parking */}
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Toll / tax / parking
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <Num label="Amount ₹" value={extrasAmount} set={setExtrasAmount} />
              <div className="flex flex-wrap gap-3">
                <Check
                  id="q-ctoll"
                  checked={chargeToll}
                  onChange={setChargeToll}
                  label="Toll"
                />
                <Check
                  id="q-ctax"
                  checked={chargeTax}
                  onChange={setChargeTax}
                  label="Tax"
                />
                <Check
                  id="q-cparking"
                  checked={chargeParking}
                  onChange={setChargeParking}
                  label="Parking"
                />
              </div>
            </div>
            {toNum(extrasAmount) > 0 &&
              !chargeToll &&
              !chargeTax &&
              !chargeParking && (
                <div className="flex items-start gap-2 rounded-md bg-warning-soft/60 p-2 text-xs text-warning-foreground">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Tick a label box — invoice will default to &ldquo;Toll &amp; Parking&rdquo;.
                  </span>
                </div>
              )}
            {toNum(extrasAmount) > 0 && (chargeToll || chargeTax || chargeParking) && (
              <p className="text-xs text-muted-foreground">
                Invoice will read: <span className="font-medium">{liveExtrasLabel}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right column: live preview + submit */}
      <Card className="lg:sticky lg:top-20 h-fit">
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
            Live preview
          </p>
          {preview.subtotal === 0 ? (
            <p className="text-sm text-muted-foreground">
              Fill the trip details to see the amount.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1 text-sm">
                {preview.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-3">
                    <span className="text-muted-foreground whitespace-pre-line truncate">
                      {l.particulars}
                    </span>
                    <span className="font-mono tabular-nums shrink-0">
                      {formatINR(l.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 flex flex-col gap-0.5 text-sm">
                <Row label="Subtotal" value={formatINR(preview.subtotal)} />
                {preview.gst.mode === "RCM" && (
                  <>
                    <Row label="CGST @ 2.5% Under RCM" value="—" muted />
                    <Row label="SGST @ 2.5% Under RCM" value="—" muted />
                  </>
                )}
                {preview.gst.mode === "CGST_SGST" && (
                  <>
                    <Row label="CGST @ 2.5%" value={formatINR(preview.gst.cgst)} />
                    <Row label="SGST @ 2.5%" value={formatINR(preview.gst.sgst)} />
                  </>
                )}
                {preview.gst.mode === "IGST" && (
                  <Row label="IGST @ 5%" value={formatINR(preview.gst.igst)} />
                )}
                {preview.extras > 0 && (
                  <Row label={liveExtrasLabel} value={formatINR(preview.extras)} />
                )}
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Net Amount</span>
                <span className="font-mono">{formatINR(preview.net)}</span>
              </div>
              {preview.inWords && (
                <p className="text-xs text-muted-foreground">
                  {preview.inWords}
                </p>
              )}
            </>
          )}

          {existingId && (
            <Badge variant="secondary" className="self-start">
              Reusing existing customer
            </Badge>
          )}

          <Button
            type="submit"
            disabled={pending || preview.subtotal === 0}
            className="h-11 text-base"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Issue invoice
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function Num({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );
}

function Check({
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
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer select-none"
    >
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

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : "font-mono"}>
        {value}
      </span>
    </div>
  );
}
