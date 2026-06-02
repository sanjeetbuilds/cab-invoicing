"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { SaveBar, SaveBarSpacer } from "@/components/shell/save-bar";

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
      toast.error("Total amount must be greater than zero, check the rates.");
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
      // Land on the in-shell PDF viewer so the user can preview / share
      // without leaving the app (and without spawning a new tab that
      // gets trapped inside an installed PWA).
      router.push(`/invoices/${result.invoice_id}`);
    } else {
      toast.error(result.error);
      setPending(false);
    }
  }

  return (
    <form
      id="quick-invoice-form"
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
    >
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
              <div className="md:col-span-1 flex flex-col gap-2 relative">
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-phone">Phone</Label>
                <Input
                  id="q-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 …"
                />
              </div>
              <div className="flex flex-col gap-2">
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-gstin">GSTIN</Label>
                <Input
                  id="q-gstin"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
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
              <div className="flex flex-col gap-2">
                <Label className="text-xs">RCM (reverse charge)</Label>
                <div className="flex h-9 items-center">
                  <Switch checked={isRcm} onCheckedChange={setIsRcm} />
                  <span className="ml-3 text-sm text-muted-foreground">
                    {isRcm ? "Yes, GST under RCM" : "No, charge GST"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
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
              Trip
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <Label htmlFor="q-end">End date</Label>
                <Input
                  id="q-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
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
              <div className="flex flex-col gap-2">
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

            <div className="flex flex-col gap-2">
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

            <InlineVehicleForm
              open={addingVehicle !== null}
              onOpenChange={(o) => {
                if (!o) setAddingVehicle(null);
              }}
              defaultNumber={addingVehicle ?? ""}
              defaultOwnership="attached"
              onSaved={(v) => {
                setLocalVehicles((prev) => [...prev, v]);
                setVehicleId(v.id);
                if (CAR_TYPES.includes(v.type)) setCarType(v.type);
                setAddingVehicle(null);
              }}
            />

            {/* Mode-specific RATE inputs. Quick Invoice has no rate card to
                pull from, the user types the rates inline. The
                count × rate = amount layout makes the math visible
                while keeping every value editable. */}
            <p className="text-xs text-muted-foreground italic -mt-1">
              Enter rates for this one-time customer. They are not saved to
              any rate card.
            </p>

            {mode === "local" && (() => {
              const totalKmsN = toNum(totalKms);
              const totalHoursN = toNum(totalHours);
              const baseKmsN = toNum(baseKms);
              const baseHoursN = toNum(baseHours);
              const addlKms = Math.max(0, totalKmsN - baseKmsN);
              const addlHrs = Math.max(0, totalHoursN - baseHoursN);
              return (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <Num label="Total kms *" value={totalKms} set={setTotalKms} />
                    <Num label="Total hrs" value={totalHours} set={setTotalHours} />
                  </div>
                  {/* Base, the slab line on the invoice. All three
                      values are editable parameters for this one trip. */}
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 flex flex-col gap-2">
                    <Label className="text-xs">Base rate</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Num label="Base rate ₹" value={baseRate} set={setBaseRate} />
                      <Num label="Base kms" value={baseKms} set={setBaseKms} />
                      <Num label="Base hours" value={baseHours} set={setBaseHours} />
                    </div>
                  </div>
                  <AutoCountRateRow
                    label="Additional kms"
                    unit="km"
                    qty={addlKms}
                    qtyFormatter={(n) => `${n} km`}
                    rate={extraKm}
                    setRate={setExtraKm}
                  />
                  <AutoCountRateRow
                    label="Additional hrs"
                    unit="hr"
                    qty={addlHrs}
                    qtyFormatter={(n) => `${n} hr`}
                    rate={extraHour}
                    setRate={setExtraHour}
                  />
                  <EditableCountRateRow
                    label="Night charges"
                    unit="night"
                    count={nightCount}
                    setCount={setNightCount}
                    rate={night}
                    setRate={setNight}
                  />
                  <EditableCountRateRow
                    label="Driver TA"
                    unit="day"
                    count={driverTaDays}
                    setCount={setDriverTaDays}
                    rate={driverTaRate}
                    setRate={setDriverTaRate}
                  />
                </div>
              );
            })()}

            {mode === "outstation" && (
              <div className="flex flex-col gap-4">
                <AutoCountRateRow
                  label="Total kms"
                  unit="km"
                  qty={toNum(totalKms)}
                  qtyFormatter={() => ""}
                  rate={perKm}
                  setRate={setPerKm}
                  countInput={
                    <Num label="Total kms *" value={totalKms} set={setTotalKms} />
                  }
                />
                <EditableCountRateRow
                  label="Driver TA"
                  unit="day"
                  count={driverTaDays}
                  setCount={setDriverTaDays}
                  rate={driverTaRate}
                  setRate={setDriverTaRate}
                />
              </div>
            )}

            {isFixed && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
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
                </div>
                <EditableCountRateRow
                  label="Driver TA"
                  unit="day"
                  count={driverTaDays}
                  setCount={setDriverTaDays}
                  rate={driverTaRate}
                  setRate={setDriverTaRate}
                />
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="q-notes" className="text-xs">Notes</Label>
                  <Textarea
                    id="q-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
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
                  <AlertTriangle className="h-4 w-4 mt-1 shrink-0" />
                  <span>
                    Tick a label box, invoice will default to &ldquo;Toll &amp; Parking&rdquo;.
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
      <SaveBarSpacer />
      <SaveBar
        formId="quick-invoice-form"
        pending={pending}
        canSave={preview.subtotal > 0}
        onCancel={() => router.push("/invoices")}
        saveLabel="Issue invoice"
        savingLabel="Issuing..."
      />
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
    <div className="flex flex-col gap-2">
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

/**
 * Inline [count input] × ₹[rate input]/unit = ₹amount. Both the count
 * and the rate are editable, Quick Invoice has no rate-card metadata
 * to inherit from.
 */
function EditableCountRateRow({
  label,
  unit,
  count,
  setCount,
  rate,
  setRate,
}: {
  label: string;
  unit: string;
  count: string;
  setCount: (v: string) => void;
  rate: string;
  setRate: (v: string) => void;
}) {
  const countN = toNum(count);
  const rateN = toNum(rate);
  const amount = countN > 0 && rateN > 0 ? Math.round(countN * rateN * 100) / 100 : 0;
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          className="w-20 shrink-0"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          aria-label={`${label} count`}
        />
        <span className="text-xs text-muted-foreground">×</span>
        <span className="text-xs text-muted-foreground">₹</span>
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          className="w-28 shrink-0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          aria-label={`${label} rate`}
        />
        <span className="text-xs text-muted-foreground">/ {unit}</span>
        <span className="text-xs text-muted-foreground">=</span>
        <span className="font-mono font-semibold tabular-nums text-sm">
          {formatINR(amount)}
        </span>
      </div>
    </div>
  );
}

/**
 * Inline (auto count) × ₹[rate input]/unit = ₹amount. The count is
 * computed elsewhere (e.g. total kms − base kms) and shown read-only;
 * the rate is editable. Optional countInput lets callers supply their
 * own input (e.g. outstation where the count IS the editable Total kms).
 */
function AutoCountRateRow({
  label,
  unit,
  qty,
  qtyFormatter,
  rate,
  setRate,
  countInput,
}: {
  label: string;
  unit: string;
  qty: number;
  qtyFormatter: (n: number) => string;
  rate: string;
  setRate: (v: string) => void;
  countInput?: React.ReactNode;
}) {
  const rateN = toNum(rate);
  const amount = qty > 0 && rateN > 0 ? Math.round(qty * rateN * 100) / 100 : 0;
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2 flex-wrap">
        {countInput ? (
          countInput
        ) : (
          <span className="font-mono text-sm tabular-nums min-w-12 text-foreground/80">
            {qtyFormatter(qty)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">×</span>
        <span className="text-xs text-muted-foreground">₹</span>
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          className="w-28 shrink-0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          aria-label={`${label} rate`}
        />
        <span className="text-xs text-muted-foreground">/ {unit}</span>
        <span className="text-xs text-muted-foreground">=</span>
        <span className="font-mono font-semibold tabular-nums text-sm">
          {formatINR(amount)}
        </span>
      </div>
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

