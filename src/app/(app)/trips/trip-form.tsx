"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  BillingMethod,
  CarType,
  Client,
  RateCard,
  Trip,
  TripMode,
  Vehicle,
} from "@/lib/supabase/types";
import { tripToLines, tripTotal } from "@/lib/trip-lines";
import { chargeLabel } from "@/lib/charges";
import { formatINR } from "@/lib/format";
import { ClientPicker } from "@/components/pickers/client-picker";
import { VehiclePicker } from "@/components/pickers/vehicle-picker";
import { createTripAction, updateTripAction } from "./actions";
import { InlineVehicleForm } from "./inline-vehicle-form";
import { InlineRateCardForm } from "./inline-rate-card-form";

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];
const decimalRegex = /^\d*\.?\d*$/;

const Schema = z
  .object({
    date: z.string().min(1, "Pick a date."),
    end_date: z.string().optional(),
    client_id: z.string().min(1, "Pick a client."),
    vehicle_id: z.string().min(1, "Pick a vehicle."),
    car_type: z.enum(CAR_TYPES),
    mode: z.enum(["local", "outstation", "transfer", "package"]),
    plan_name: z.string().optional(),
    billing_method: z.enum(["per_km", "slab"]),
    total_kms: z.string().optional(),
    total_hours: z.string().optional(),
    night_count: z.string().optional(),
    driver_ta: z.string().optional(),
    extra_charge_amount: z
      .string()
      .optional()
      .refine((v) => !v || decimalRegex.test(v), {
        message: "Enter a decimal amount.",
      }),
    charge_toll: z.boolean(),
    charge_tax: z.boolean(),
    charge_parking: z.boolean(),
    notes: z.string().optional(),
    duty_slip_no: z.string().optional(),
  })
  .refine(
    (d) => !d.end_date || d.end_date >= d.date,
    { message: "End date must be on or after the start date.", path: ["end_date"] },
  )
  .refine(
    (d) =>
      d.mode === "transfer" || d.mode === "package"
        ? Boolean(d.plan_name && d.plan_name.trim())
        : true,
    { message: "Pick a plan.", path: ["plan_name"] },
  )
  .refine(
    (d) =>
      d.mode === "local" || d.mode === "outstation"
        ? Boolean(d.total_kms && d.total_kms.trim())
        : true,
    { message: "Enter kms.", path: ["total_kms"] },
  );
type FormValues = z.infer<typeof Schema>;

const todayIso = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toNum = (s: string | undefined) => {
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
};

export function TripForm({
  trip,
  clients,
  vehicles,
  rateCards,
  recentDefaults,
  recentTrips,
}: {
  trip?: Trip | null;
  clients: Pick<Client, "id" | "name">[];
  vehicles: Pick<Vehicle, "id" | "number" | "type" | "active">[];
  rateCards: RateCard[];
  recentDefaults?: Pick<
    Trip,
    "client_id" | "vehicle_id" | "car_type" | "mode" | "billing_method"
  > | null;
  /** Trips from the last 30 days — used to pre-select Mode when the
   *  user changes the (client, car) combo. Most recent wins. */
  recentTrips?: Pick<
    Trip,
    "client_id" | "car_type" | "mode" | "plan_name" | "billing_method" | "created_at"
  >[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const editing = !!trip;

  // Track vehicles & rate cards in local state so inline-create flows
  // can append new rows without re-rendering / losing the form.
  const [localVehicles, setLocalVehicles] = useState(vehicles);
  const [localRateCards, setLocalRateCards] = useState(rateCards);
  const [addingVehicle, setAddingVehicle] = useState<null | string>(null);
  // null = panel closed; "create" = adding a new rate; "edit" = editing
  // the currently-active rate. The same InlineRateCardForm handles both.
  const [rateEditor, setRateEditor] = useState<null | "create" | "edit">(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      date: trip?.date ?? todayIso(),
      end_date: trip?.end_date ?? "",
      // For NEW trips, seed client + vehicle from the user's most recent
      // trip in the last week — most drivers log the same combo day after
      // day. Editing an existing trip uses its own stored values.
      client_id: trip?.client_id ?? recentDefaults?.client_id ?? "",
      vehicle_id: trip?.vehicle_id ?? recentDefaults?.vehicle_id ?? "",
      car_type: trip?.car_type ?? recentDefaults?.car_type ?? "Sonet",
      mode: trip?.mode ?? recentDefaults?.mode ?? "local",
      plan_name: trip?.plan_name ?? "",
      billing_method:
        trip?.billing_method ??
        recentDefaults?.billing_method ??
        ((trip?.mode ?? recentDefaults?.mode) === "outstation"
          ? "per_km"
          : "slab"),
      total_kms: trip ? String(trip.total_kms) : "",
      total_hours: trip ? String(trip.total_hours) : "",
      night_count: trip
        ? String(trip.night_count ?? (trip.night ? 1 : 0))
        : "0",
      driver_ta: trip ? String(trip.driver_ta) : "0",
      extra_charge_amount:
        trip != null ? String(trip.extra_charge_amount || trip.toll || 0) : "0",
      charge_toll: trip?.charge_toll ?? false,
      charge_tax: trip?.charge_tax ?? false,
      charge_parking: trip?.charge_parking ?? false,
      notes: trip?.notes ?? "",
      duty_slip_no: trip?.duty_slip_no ?? "",
    },
  });

  const clientId = watch("client_id");
  const vehicleId = watch("vehicle_id");
  const carType = watch("car_type");
  const mode = watch("mode") as TripMode;

  // Smart mode default: when (client, car) changes, pick the most
  // recent mode the user used for that exact combo within the last
  // 30 days. Only runs when the user changes the combo AFTER mount —
  // initial mount uses recentDefaults (handled in defaultValues above).
  // Only updates mode if the user hasn't manually touched it for this
  // form session (dirtyFields.mode === false).
  const modeBootstrapped = useRef(false);
  useEffect(() => {
    if (!modeBootstrapped.current) {
      modeBootstrapped.current = true;
      return;
    }
    if (!clientId || !carType || !recentTrips || recentTrips.length === 0) {
      return;
    }
    if (editing) return; // never override an existing trip's stored mode
    const match = recentTrips.find(
      (t) => t.client_id === clientId && t.car_type === carType,
    );
    if (!match) return;
    setValue("mode", match.mode, { shouldValidate: false });
    if (match.plan_name) {
      setValue("plan_name", match.plan_name, { shouldValidate: false });
    }
    if (match.mode === "outstation") {
      setValue("billing_method", match.billing_method, { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, carType]);
  const planName = watch("plan_name") ?? "";
  const formBillingMethod = watch("billing_method") as BillingMethod;
  const isFixed = mode === "transfer" || mode === "package";
  const effectiveMethod: BillingMethod = isFixed
    ? "slab"
    : mode === "local"
      ? "slab"
      : formBillingMethod;
  const nightCountStr = watch("night_count");
  const totalKmsStr = watch("total_kms");
  const totalHoursStr = watch("total_hours");
  const driverTaStr = watch("driver_ta");

  const nightCount = Math.max(0, Math.floor(toNum(nightCountStr)));
  const extraChargeStr = watch("extra_charge_amount");
  const chargeToll = watch("charge_toll");
  const chargeTax = watch("charge_tax");
  const chargeParking = watch("charge_parking");

  const extraChargeAmount = toNum(extraChargeStr);
  const anyTicked = chargeToll || chargeTax || chargeParking;
  const showChargeWarning = extraChargeAmount > 0 && !anyTicked;
  const liveChargeLabel = chargeLabel(
    { toll: chargeToll, tax: chargeTax, parking: chargeParking },
    extraChargeAmount,
  );

  // For local/outstation, slab borrows the LOCAL rate card. For
  // transfer/package, lookup uses the trip's mode + plan_name.
  const rateLookupMode: TripMode = isFixed
    ? mode
    : effectiveMethod === "slab"
      ? "local"
      : "outstation";

  const activeRate = useMemo(
    () =>
      localRateCards.find((r) => {
        if (
          r.client_id !== clientId ||
          r.car_type !== carType ||
          r.mode !== rateLookupMode
        )
          return false;
        if (isFixed) return (r.plan_name ?? "") === planName;
        return true;
      }),
    [localRateCards, clientId, carType, rateLookupMode, isFixed, planName],
  );

  // All (mode, plan_name) combos available for the current (client, car).
  // This is what the Mode dropdown actually shows — one entry per
  // existing rate card. Picking it sets both mode and plan_name.
  const availableRatePlans = useMemo(() => {
    const rows = localRateCards.filter(
      (r) => r.client_id === clientId && r.car_type === carType,
    );
    // Sort: local → outstation → transfer plans → package plans
    const order: Record<TripMode, number> = {
      local: 0,
      outstation: 1,
      transfer: 2,
      package: 3,
    };
    return rows.slice().sort((a, b) => {
      if (order[a.mode] !== order[b.mode]) return order[a.mode] - order[b.mode];
      return (a.plan_name ?? "").localeCompare(b.plan_name ?? "");
    });
  }, [localRateCards, clientId, carType]);

  const preview = useMemo(() => {
    if (!activeRate) return null;
    const lines = tripToLines(
      {
        car_type: carType,
        mode,
        billing_method: effectiveMethod,
        total_kms: toNum(totalKmsStr),
        total_hours: toNum(totalHoursStr),
        night: nightCount > 0,
        night_count: nightCount,
        driver_ta: Math.floor(toNum(driverTaStr)),
      },
      activeRate,
    );
    return { lines, total: tripTotal(lines) };
  }, [activeRate, carType, mode, effectiveMethod, totalKmsStr, totalHoursStr, nightCount, driverTaStr]);

  async function onSubmit(values: FormValues) {
    setPending(true);
    const fd = new FormData();
    fd.set("date", values.date);
    fd.set("end_date", values.end_date ?? "");
    fd.set("client_id", values.client_id);
    fd.set("vehicle_id", values.vehicle_id);
    fd.set("car_type", values.car_type);
    fd.set("mode", values.mode);
    fd.set("plan_name", values.plan_name ?? "");
    fd.set(
      "billing_method",
      values.mode === "local" || isFixed ? "slab" : values.billing_method,
    );
    fd.set("total_kms", values.total_kms ?? "0");
    fd.set("total_hours", values.total_hours ?? "0");
    fd.set("night_count", values.night_count ?? "0");
    fd.set("driver_ta", values.driver_ta ?? "0");
    fd.set("extra_charge_amount", values.extra_charge_amount ?? "0");
    fd.set("charge_toll", String(values.charge_toll));
    fd.set("charge_tax", String(values.charge_tax));
    fd.set("charge_parking", String(values.charge_parking));
    fd.set("notes", values.notes ?? "");
    fd.set("duty_slip_no", values.duty_slip_no ?? "");

    const result = editing
      ? await updateTripAction(trip!.id, fd)
      : await createTripAction(fd);

    if (result.ok) {
      toast.success(editing ? "Trip updated." : "Trip logged.");
      router.push("/trips");
      router.refresh();
    } else {
      toast.error(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Sticky running total — chip pinned just under the top strip so
          the user always sees the number while filling fields. Kept
          inside the form's natural width (no negative margins) and given
          symmetric vertical padding for clean alignment. */}
      {activeRate && preview && (
        <div className="sticky top-12 sm:top-14 z-20 rounded-lg border border-border bg-card shadow-card px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground leading-none">
            Trip total
          </span>
          <span className="font-mono text-lg font-semibold tabular-nums leading-none">
            {formatINR(preview.total)}
          </span>
        </div>
      )}

      {/* Top: dates + client */}
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="end_date">End date</Label>
            <Input id="end_date" type="date" {...register("end_date")} />
            <p className="text-xs text-muted-foreground">
              Optional — only set for multi-day duties.
            </p>
            {errors.end_date && (
              <p className="text-sm text-destructive">{errors.end_date.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="client_id">Client *</Label>
            <ClientPicker
              id="client_id"
              clients={clients}
              value={clientId}
              onValueChange={(v) =>
                setValue("client_id", v, { shouldValidate: true })
              }
            />
            {errors.client_id && (
              <p className="text-sm text-destructive">{errors.client_id.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle + car type + rate plan + slab toggle */}
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="vehicle_id">Vehicle *</Label>
            <VehiclePicker
              id="vehicle_id"
              vehicles={localVehicles}
              value={vehicleId}
              onValueChange={(v) => {
                setValue("vehicle_id", v, { shouldValidate: true });
                const veh = localVehicles.find((x) => x.id === v);
                if (veh && CAR_TYPES.includes(veh.type)) {
                  setValue("car_type", veh.type, { shouldValidate: true });
                }
              }}
              onAddNew={(typed) => setAddingVehicle(typed)}
            />
            {errors.vehicle_id && (
              <p className="text-sm text-destructive">{errors.vehicle_id.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="car_type">Car type *</Label>
            <Select
              value={carType}
              onValueChange={(v) => {
                if (typeof v === "string") {
                  setValue("car_type", v as CarType, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="car_type">
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
            <CarTypeOverrideNote
              vehicleId={vehicleId}
              carType={carType}
              vehicles={localVehicles}
            />
          </div>

          <div className="md:col-span-3 flex flex-col gap-2">
            <Label htmlFor="mode">Rate plan *</Label>
            {availableRatePlans.length === 0 ? (
              <div className="flex flex-col gap-2 rounded-md bg-warning-soft/60 p-3 text-sm">
                <p className="text-foreground">
                  No rate cards exist for{" "}
                  <span className="font-medium">
                    {clients.find((c) => c.id === clientId)?.name ??
                      "this client"}
                  </span>{" "}
                  · <span className="font-medium">{carType}</span>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Pick a client + car type first, then add a rate card below or
                  on the Rate cards page.
                </p>
              </div>
            ) : (
              <Select
                value={`${mode}|${planName}`}
                onValueChange={(v) => {
                  if (typeof v !== "string") return;
                  const [pickedMode, pickedPlan] = v.split("|") as [
                    TripMode,
                    string,
                  ];
                  setValue("mode", pickedMode, { shouldValidate: true });
                  setValue("plan_name", pickedPlan, { shouldValidate: true });
                  if (pickedMode === "outstation") {
                    setValue("billing_method", "per_km");
                  } else {
                    setValue("billing_method", "slab");
                  }
                }}
              >
                <SelectTrigger id="mode">
                  <SelectValue placeholder="Pick a rate plan" />
                </SelectTrigger>
                <SelectContent>
                  {availableRatePlans.map((r) => {
                    const key = `${r.mode}|${r.plan_name ?? ""}`;
                    const label =
                      r.mode === "local"
                        ? "Local"
                        : r.mode === "outstation"
                          ? "Outstation"
                          : `${r.mode === "transfer" ? "Transfer" : "Package"} · ${r.plan_name ?? ""}`;
                    return (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            {errors.plan_name && (
              <p className="text-xs text-destructive">
                {errors.plan_name.message}
              </p>
            )}
            {activeRate && (
              <p className="md:col-span-3 text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground/80">
                  Active rate card:
                </span>{" "}
                {rateCardSummary(activeRate)}{" "}
                <button
                  type="button"
                  onClick={() => setRateEditor("edit")}
                  className="text-primary hover:text-primary-hover font-medium underline-offset-2 hover:underline"
                >
                  Edit
                </button>
              </p>
            )}
          </div>

          {mode === "outstation" && (
            <div className="sm:col-span-3 flex items-start justify-between rounded-lg border border-border px-3 py-3 gap-3">
              <div className="min-w-0 flex-1">
                <Label htmlFor="billing_method" className="font-medium">
                  Bill as slab (use local rate card)
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Default for outstation is per-km. Toggle on to bill this trip
                  with the client&apos;s local rate card for{" "}
                  <span className="font-medium">{carType}</span>: base + extras.
                </p>
              </div>
              <Switch
                id="billing_method"
                checked={formBillingMethod === "slab"}
                onCheckedChange={(v) =>
                  setValue("billing_method", v ? "slab" : "per_km", {
                    shouldValidate: true,
                  })
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {addingVehicle !== null && (
        <InlineVehicleForm
          defaultNumber={addingVehicle}
          onCancel={() => setAddingVehicle(null)}
          onCreated={(v) => {
            setLocalVehicles((prev) => [...prev, v]);
            setValue("vehicle_id", v.id, { shouldValidate: true });
            if (CAR_TYPES.includes(v.type)) {
              setValue("car_type", v.type, { shouldValidate: true });
            }
            setAddingVehicle(null);
          }}
        />
      )}

      {/* Distances & quantities. Quantity-style fields (TA, Night) use
          the count × rate = amount layout so the math is visible at a
          glance. Rate values come from the active rate card and are
          shown as metadata (not editable here — edit on the Rate Cards
          page). */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          {(mode === "local" || mode === "outstation") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="total_kms">Total kms *</Label>
                <Input
                  id="total_kms"
                  type="number"
                  inputMode="numeric"
                  {...register("total_kms")}
                />
                {errors.total_kms && (
                  <p className="text-xs text-destructive">{errors.total_kms.message}</p>
                )}
              </div>
              {mode === "local" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="total_hours">Total hrs</Label>
                  <Input
                    id="total_hours"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    {...register("total_hours")}
                  />
                </div>
              )}
            </div>
          )}

          <CountRateAmountRow
            label="Driver TA"
            unit="day"
            count={Math.floor(toNum(driverTaStr))}
            rate={activeRate?.driver_ta ?? null}
            register={register("driver_ta")}
          />

          {mode === "local" && (
            <CountRateAmountRow
              label="Night charges"
              unit="night"
              count={nightCount}
              rate={activeRate?.night ?? null}
              register={register("night_count")}
            />
          )}
        </CardContent>
      </Card>

      {/* Toll / Tax / Parking */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          {mode === "package" &&
            activeRate &&
            (activeRate.includes_toll ||
              activeRate.includes_tax ||
              activeRate.includes_parking) && (
              <div className="flex items-start gap-2 rounded-md bg-warning-soft/60 p-2 text-xs text-warning-foreground">
                <AlertTriangle className="h-4 w-4 mt-1 shrink-0" />
                <span>
                  This package includes{" "}
                  {[
                    activeRate.includes_toll && "toll",
                    activeRate.includes_tax && "tax",
                    activeRate.includes_parking && "parking",
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                  . Charge extra only if outside the agreement.
                </span>
              </div>
            )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="extra_charge_amount">Toll / tax / parking amount</Label>
            <Input
              id="extra_charge_amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              {...register("extra_charge_amount", {
                onChange: (e) => {
                  const v = e.target.value;
                  if (v !== "" && !decimalRegex.test(v)) {
                    e.target.value = v.slice(0, -1);
                  }
                },
              })}
            />
            {errors.extra_charge_amount && (
              <p className="text-xs text-destructive">
                {errors.extra_charge_amount.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              One amount. Added to the invoice net after GST. Use the boxes
              below to label what it covers.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <CheckboxLabel
              id="charge_toll"
              checked={chargeToll}
              onChange={(v) => setValue("charge_toll", v)}
              label="Toll"
            />
            <CheckboxLabel
              id="charge_tax"
              checked={chargeTax}
              onChange={(v) => setValue("charge_tax", v)}
              label="Tax"
            />
            <CheckboxLabel
              id="charge_parking"
              checked={chargeParking}
              onChange={(v) => setValue("charge_parking", v)}
              label="Parking"
            />
          </div>

          {extraChargeAmount > 0 && anyTicked && (
            <p className="text-xs text-muted-foreground">
              Invoice will read:{" "}
              <span className="font-medium">{liveChargeLabel}</span>
            </p>
          )}
          {showChargeWarning && (
            <div className="flex items-start gap-2 rounded-md bg-warning-soft p-2 text-xs text-warning-foreground">
              <AlertTriangle className="h-4 w-4 mt-1 shrink-0" />
              <span>
                You entered an amount but didn&apos;t tick a box. The invoice
                will default to{" "}
                <strong>&ldquo;Toll &amp; Parking&rdquo;</strong>.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slip + notes */}
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="duty_slip_no">Duty slip no.</Label>
            <Input id="duty_slip_no" {...register("duty_slip_no")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent>
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-2">
            Trip amount preview
          </p>
          {!clientId || !carType || !mode ? (
            <p className="text-sm text-muted-foreground">
              Pick client, car, and mode to preview the amount.
            </p>
          ) : !activeRate ? (
            <div className="flex flex-col gap-3 rounded-md bg-warning-soft/60 p-3 text-sm">
              <p className="text-foreground">
                No rate set for{" "}
                <span className="font-medium">
                  {clients.find((c) => c.id === clientId)?.name ?? "this client"}
                </span>{" "}
                ·{" "}
                <span className="font-medium">{carType}</span> ·{" "}
                <span className="font-medium">{rateLookupMode}</span>.
              </p>
              {mode === "outstation" && effectiveMethod === "slab" && (
                <p className="text-xs text-muted-foreground">
                  Slab billing borrows the local rate card — add a local rate
                  for this car type or switch this trip back to per-km.
                </p>
              )}
              {rateEditor !== "create" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="self-start"
                  onClick={() => setRateEditor("create")}
                >
                  + Add rate card
                </Button>
              )}
            </div>
          ) : preview ? (
            <div className="flex flex-col gap-1 text-sm">
              {preview.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="text-muted-foreground whitespace-pre-line">
                    {l.particulars}
                    {l.qty != null && l.rate != null
                      ? ` (${l.qty} × ${formatINR(l.rate)})`
                      : ""}
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatINR(l.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 mt-1 font-semibold">
                <span>Trip total</span>
                <span className="font-mono tabular-nums">
                  {formatINR(preview.total)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                +{formatINR(extraChargeAmount)} ({liveChargeLabel}) added on the
                invoice, not here.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {rateEditor !== null && clientId && carType && (
        <InlineRateCardForm
          clientId={clientId}
          clientName={
            clients.find((c) => c.id === clientId)?.name ?? "this client"
          }
          carType={carType}
          mode={rateLookupMode}
          existing={rateEditor === "edit" ? activeRate : null}
          onCancel={() => setRateEditor(null)}
          onCreated={(rc) => {
            setLocalRateCards((prev) => {
              // Replace any existing rate card with the same natural key
              // — covers both create-new and edit-existing.
              const filtered = prev.filter(
                (r) =>
                  !(
                    r.client_id === rc.client_id &&
                    r.car_type === rc.car_type &&
                    r.mode === rc.mode &&
                    (r.plan_name ?? "") === (rc.plan_name ?? "")
                  ),
              );
              return [...filtered, rc];
            });
            setRateEditor(null);
          }}
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/trips")}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Save changes" : "Log trip"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Inline [count] × ₹rate/unit = ₹amount row. The count is editable; the
 * rate is pulled from the active rate card (read-only here — edit it on
 * the Rate Cards page); the amount is the computed result. Renders an
 * "Rate not set" hint if the rate card is missing the relevant field.
 */
function CountRateAmountRow({
  label,
  unit,
  count,
  rate,
  register,
}: {
  label: string;
  unit: string;
  count: number;
  rate: number | null;
  register: UseFormRegisterReturn;
}) {
  const amount = rate != null && count > 0 ? Math.round(count * rate * 100) / 100 : 0;
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          className="w-24 shrink-0"
          {...register}
        />
        {rate == null ? (
          <span className="text-xs text-muted-foreground">
            × <span className="italic">rate not set</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground tabular-nums">
            ×{" "}
            <span className="text-foreground/80 font-medium">
              {formatINR(rate)}
            </span>
            /{unit}
          </span>
        )}
        <span className="text-xs text-muted-foreground">=</span>
        <span className="font-mono font-semibold tabular-nums text-sm">
          {formatINR(amount)}
        </span>
      </div>
    </div>
  );
}

/**
 * Compact one-line summary of a rate card, e.g.
 *   "Local · 80km/8hr · ₹1,500 base · ₹15/extra km · ₹100/extra hr · Night ₹300 · TA ₹300/day"
 * Used in the trip form to show the user which rate card is driving the
 * preview without taking up a separate panel of input-looking boxes.
 */
function rateCardSummary(r: RateCard): string {
  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : formatINR(n);
  const ta = `TA ${fmt(r.driver_ta)}/day`;
  if (r.mode === "local") {
    return [
      "Local",
      `${r.base_kms ?? "—"}km/${r.base_hours ?? "—"}hr`,
      `${fmt(r.base_rate)} base`,
      `${fmt(r.extra_km)}/extra km`,
      `${fmt(r.extra_hour)}/extra hr`,
      `Night ${fmt(r.night)}`,
      ta,
    ].join(" · ");
  }
  if (r.mode === "outstation") {
    return ["Outstation", `${fmt(r.per_km)}/km`, ta].join(" · ");
  }
  // transfer / package
  const inclusions: string[] = [];
  if (r.includes_toll) inclusions.push("toll");
  if (r.includes_tax) inclusions.push("tax");
  if (r.includes_parking) inclusions.push("parking");
  const incl = inclusions.length > 0 ? `incl. ${inclusions.join(" / ")}` : null;
  return [
    r.mode === "transfer" ? "Transfer" : "Package",
    r.plan_name ?? "—",
    `${fmt(r.fixed_price)} fixed`,
    ta,
    ...(incl ? [incl] : []),
  ].join(" · ");
}

function CarTypeOverrideNote({
  vehicleId,
  carType,
  vehicles,
}: {
  vehicleId: string;
  carType: CarType;
  vehicles: Pick<Vehicle, "id" | "type">[];
}) {
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  if (!vehicle || vehicle.type === carType) return null;
  return (
    <div
      className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
      role="note"
    >
      <AlertTriangle className="h-3.5 w-3.5 mt-1 shrink-0" />
      <span>
        Override: billed as <strong>{carType}</strong> (vehicle is actually{" "}
        <strong>{vehicle.type}</strong>).
      </span>
    </div>
  );
}

function CheckboxLabel({
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
