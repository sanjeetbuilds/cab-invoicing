"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SaveBar, SaveBarSpacer } from "@/components/shell/save-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
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

/** Sentinel value used inside the rate-plan Select to open the
 *  bundle editor instead of selecting a plan. */
const RATE_PICKER_ADD_VALUE = "__add__";

function modeLabel(mode: TripMode): string {
  return mode === "local"
    ? "Local"
    : mode === "outstation"
      ? "Outstation"
      : mode === "transfer"
        ? "Transfer"
        : "Package";
}

/** Human label for one rate plan in the trip-form picker.
 *  Local and Outstation use their mode name. Transfer / Package
 *  rows show the user-typed plan name plus the fixed price. */
function planPickerLabel(r: RateCard): string {
  if (r.mode === "local") return "Local";
  if (r.mode === "outstation") return "Outstation";
  const name =
    r.plan_name?.trim() || (r.mode === "transfer" ? "Transfer" : "Package");
  if (r.fixed_price == null) return name;
  return `${name}, ${formatINR(r.fixed_price)}`;
}

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
  /** Trips from the last 30 days, used to pre-select Mode when the
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
  // Open state + typed-number prefill for the vehicle editor sheet.
  // Closing the sheet sets defaultNumber back to null.
  const [vehicleEditorDefault, setVehicleEditorDefault] = useState<null | string>(null);
  // null = panel closed; "create" = adding a new rate; "edit" = editing
  // the currently-active rate. The same InlineRateCardForm handles both.
  const [rateEditor, setRateEditor] = useState<null | "create" | "edit">(null);

  // Guard recentDefaults: only seed values that still resolve to a
  // real record. A stale recentDefaults pointing to a deleted
  // vehicle would silently break the trip form. NOTE: client_id is
  // deliberately NOT seeded from recentDefaults, every new trip
  // should make the user pick the client themselves so they never
  // log a trip against the wrong company by inheriting yesterday's
  // pick.
  const safeRecentVehicle =
    recentDefaults?.vehicle_id &&
    vehicles.some((v) => v.id === recentDefaults.vehicle_id)
      ? recentDefaults.vehicle_id
      : "";
  const safeRecentCarType: CarType =
    recentDefaults?.car_type && CAR_TYPES.includes(recentDefaults.car_type)
      ? recentDefaults.car_type
      : "Sonet";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      date: trip?.date ?? todayIso(),
      end_date: trip?.end_date ?? "",
      // For NEW trips, seed client + vehicle from the user's most recent
      // trip in the last week, most drivers log the same combo day after
      // day. Editing an existing trip uses its own stored values. Every
      // seed below has already been validated against the current
      // options, no stale rows can sneak in.
      client_id: trip?.client_id ?? "",
      vehicle_id: trip?.vehicle_id ?? safeRecentVehicle,
      car_type: trip?.car_type ?? safeRecentCarType,
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
  // 30 days. Only runs when the user changes the combo AFTER mount -
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
  // This is what the Mode dropdown actually shows, one entry per
  // existing rate card. Picking it sets both mode and plan_name.
  const availableRatePlans = useMemo(() => {
    const rows = localRateCards.filter(
      (r) => r.client_id === clientId && r.car_type === carType,
    );
    // Sort: local, outstation, transfer plans, package plans.
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

  // Value the rate-plan Select shows. We only present a selection
  // when the trip's (mode, plan_name) actually matches one of the
  // available plans, otherwise the trigger sits at its placeholder
  // and the user picks explicitly. Avoids the trigger displaying a
  // raw value that has no matching option.
  const pickerSelectValue = useMemo(() => {
    const key = `${mode}|${planName}`;
    return availableRatePlans.some(
      (r) => `${r.mode}|${r.plan_name ?? ""}` === key,
    )
      ? key
      : undefined;
  }, [availableRatePlans, mode, planName]);

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
    <form
      id="trip-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
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
              Only needed for a trip that runs more than one day.
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
              onAddNew={(typed) => setVehicleEditorDefault(typed)}
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

          <div className="md:col-span-3 flex flex-col gap-3">
            <Label htmlFor="mode">Rate plan *</Label>

            {/* Neutral state until a client is picked, no point
                alarming the user about a missing rate they have
                not framed yet. */}
            {!clientId && (
              <p className="text-sm text-muted-foreground">
                Pick a client and car type to see the rate.
              </p>
            )}

            {clientId && (
              <>
                {/* Clean dropdown of every rate plan that exists for
                    this (client, car) combo, with proper labels
                    (Local, Outstation, or "Plan name, Rs price").
                    The bottom item opens the bundle editor sheet so
                    a missing plan is reachable without leaving the
                    trip. */}
                <Select
                  value={pickerSelectValue}
                  onValueChange={(v) => {
                    if (typeof v !== "string") return;
                    if (v === RATE_PICKER_ADD_VALUE) {
                      setRateEditor("create");
                      return;
                    }
                    const [pickedMode, pickedPlan] = v.split("|") as [
                      TripMode,
                      string,
                    ];
                    setValue("mode", pickedMode, { shouldValidate: true });
                    setValue("plan_name", pickedPlan, { shouldValidate: true });
                    setValue(
                      "billing_method",
                      pickedMode === "outstation" ? "per_km" : "slab",
                      { shouldValidate: true },
                    );
                  }}
                >
                  <SelectTrigger id="mode">
                    <SelectValue placeholder="Pick a rate plan">
                      {(value) => {
                        if (typeof value !== "string" || !value) return null;
                        const [m, p] = value.split("|") as [TripMode, string];
                        const rate = availableRatePlans.find(
                          (r) =>
                            r.mode === m && (r.plan_name ?? "") === p,
                        );
                        return rate ? planPickerLabel(rate) : null;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableRatePlans.map((r) => {
                      const key = `${r.mode}|${r.plan_name ?? ""}`;
                      return (
                        <SelectItem key={key} value={key}>
                          {planPickerLabel(r)}
                        </SelectItem>
                      );
                    })}
                    {availableRatePlans.length > 0 && <SelectSeparator />}
                    <SelectItem value={RATE_PICKER_ADD_VALUE}>
                      + Add a rate plan
                    </SelectItem>
                  </SelectContent>
                </Select>

                {errors.plan_name && (
                  <p className="text-xs text-destructive">
                    {errors.plan_name.message}
                  </p>
                )}

                {/* When a rate is active, summarise it with an
                    Edit rates link that opens the same bundle
                    editor. When no rate is active, surface the
                    named missing-rate notice with an Add CTA
                    right in the first fold. */}
                {activeRate ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground/80">
                      Active rate card:
                    </span>{" "}
                    {rateCardSummary(activeRate)}{" "}
                    <button
                      type="button"
                      onClick={() => setRateEditor("edit")}
                      className="text-primary hover:text-primary-hover font-medium underline-offset-2 hover:underline"
                    >
                      Edit rates
                    </button>
                  </p>
                ) : (
                  <MissingRateNotice
                    clientName={clientName(clients, clientId)}
                    carType={carType}
                    mode={rateLookupMode}
                    slabBorrowsLocal={
                      mode === "outstation" && effectiveMethod === "slab"
                    }
                    onAdd={() => setRateEditor("create")}
                  />
                )}
              </>
            )}
          </div>

          {mode === "outstation" && (
            <div className="sm:col-span-3 flex items-start justify-between rounded-lg border border-border px-3 py-3 gap-3">
              <div className="min-w-0 flex-1">
                <Label htmlFor="billing_method" className="font-medium">
                  Bill at the local rate
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Default for outstation is per km. Turn this on to bill at
                  the client&apos;s local rate for{" "}
                  <span className="font-medium">{carType}</span>, base plus
                  extras.
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

      {/* Vehicle editor in the same Sheet pattern as the rate-card
          editor. Portaled to document body so its content is NEVER
          nested inside the outer trip <form>, which would make an
          inner submit bubble out and lose the draft. */}
      <InlineVehicleForm
        open={vehicleEditorDefault !== null}
        onOpenChange={(o) => {
          if (!o) setVehicleEditorDefault(null);
        }}
        defaultNumber={vehicleEditorDefault ?? ""}
        onSaved={(v) => {
          setLocalVehicles((prev) => [...prev, v]);
          setValue("vehicle_id", v.id, { shouldValidate: true });
          if (CAR_TYPES.includes(v.type)) {
            setValue("car_type", v.type, { shouldValidate: true });
          }
          setVehicleEditorDefault(null);
        }}
      />

      {/* Distances & quantities. Quantity-style fields (TA, Night) use
          the count × rate = amount layout so the math is visible at a
          glance. Rate values come from the active rate card and are
          shown as metadata (not editable here, edit on the Rate Cards
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

      {/* Live preview. The missing-rate alert lives at the top of
          the form (rate-plan area), so this card only shows the
          amount preview when a rate is set, or a neutral hint
          otherwise. No duplicate "no rate" message here. */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent>
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground mb-2">
            Trip amount preview
          </p>
          {activeRate && preview ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">
              {clientId
                ? "Add a rate above to see the amount."
                : "Pick a client and car type above to see the amount."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rate-bundle editor in a sheet. Sits outside the form
          layout via portal, so opening or closing it never
          unmounts the trip draft. The editor exposes all three
          kinds (Local, Outstation, Packages) in one panel. */}
      {clientId && carType && (
        <InlineRateCardForm
          open={rateEditor !== null}
          onOpenChange={(o) => {
            if (!o) setRateEditor(null);
          }}
          clientId={clientId}
          clientName={clientName(clients, clientId)}
          carType={carType}
          existing={availableRatePlans}
          onSaved={(result) => {
            // Sync local rate-card cache: drop deleted ids, merge
            // saved rows by id so updates replace originals.
            setLocalRateCards((prev) => {
              const removed = new Set(result.deletedIds);
              const byId = new Map(
                prev
                  .filter((r) => !removed.has(r.id))
                  .map((r) => [r.id, r] as const),
              );
              for (const r of result.saved) byId.set(r.id, r);
              return Array.from(byId.values());
            });

            // Apply one of the saved rates to the trip in
            // progress. Prefer a row that matches the trip's
            // current mode + plan_name. Else, if the user saved
            // exactly one row, pick that. Otherwise leave the
            // dropdown empty for the user to choose.
            const exactMatch = result.saved.find(
              (r) =>
                r.mode === mode && (r.plan_name ?? "") === planName,
            );
            const toApply =
              exactMatch ??
              (result.saved.length === 1 ? result.saved[0] : undefined);
            if (toApply) {
              setValue("mode", toApply.mode, { shouldValidate: true });
              setValue("plan_name", toApply.plan_name ?? "", {
                shouldValidate: true,
              });
              setValue(
                "billing_method",
                toApply.mode === "outstation" ? "per_km" : "slab",
                { shouldValidate: true },
              );
            }
            setRateEditor(null);
          }}
        />
      )}

      <SaveBarSpacer />
      <SaveBar
        formId="trip-form"
        dirty={isDirty}
        pending={pending}
        alwaysShow
        leading={
          activeRate && preview ? (
            <div className="flex items-baseline gap-2 min-w-0 whitespace-nowrap">
              <span className="text-xs text-muted-foreground shrink-0">
                Trip total
              </span>
              <span className="font-mono text-sm sm:text-base font-semibold tabular-nums truncate">
                {formatINR(preview.total)}
              </span>
            </div>
          ) : undefined
        }
        onCancel={() => router.push("/trips")}
        saveLabel={editing ? "Save changes" : "Log trip"}
      />
    </form>
  );
}

/**
 * Inline [count] × ₹rate/unit = ₹amount row. The count is editable; the
 * rate is pulled from the active rate card (read-only here, edit it on
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
    n == null ? "-" : formatINR(n);
  const ta = `TA ${fmt(r.driver_ta)}/day`;
  if (r.mode === "local") {
    return [
      "Local",
      `${r.base_kms ?? "-"}km/${r.base_hours ?? "-"}hr`,
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
    r.plan_name ?? "-",
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

/**
 * Named missing-rate notice. Always names the client, car, and
 * mode so the user knows exactly which rate is missing. Renders a
 * primary Add CTA so the user does not have to scroll to find it.
 */
function MissingRateNotice({
  clientName,
  carType,
  mode,
  slabBorrowsLocal = false,
  onAdd,
}: {
  clientName: string;
  carType: CarType;
  mode: TripMode;
  slabBorrowsLocal?: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning-soft/60 p-3 text-sm">
      <p className="text-foreground">
        No rate card yet for{" "}
        <span className="font-medium">{clientName}</span>,{" "}
        <span className="font-medium">{carType}</span>,{" "}
        <span className="font-medium">{modeLabel(mode)}</span>.
      </p>
      {slabBorrowsLocal && (
        <p className="text-xs text-muted-foreground">
          This trip is billing at the local rate. Add a local rate for this
          car, or switch back to per km.
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={onAdd}>
          Add rate card
        </Button>
        <span className="text-xs text-muted-foreground">
          Stays in this trip. Opens a side panel.
        </span>
      </div>
    </div>
  );
}

function clientName(
  clients: Pick<Client, "id" | "name">[],
  id: string,
): string {
  return clients.find((c) => c.id === id)?.name ?? "this client";
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
