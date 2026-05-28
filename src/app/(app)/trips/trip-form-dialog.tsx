"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { createTripAction, updateTripAction } from "./actions";

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];

const decimalRegex = /^\d*\.?\d*$/;

const Schema = z
  .object({
    date: z.string().min(1, "Pick a date."),
    end_date: z.string().optional(),
    client_id: z.string().min(1, "Pick a client."),
    vehicle_id: z.string().min(1, "Pick a vehicle."),
    car_type: z.enum(CAR_TYPES),
    mode: z.enum(["local", "outstation"]),
    billing_method: z.enum(["per_km", "slab"]),
    total_kms: z.string().min(1, "Enter kms."),
    total_hours: z.string().optional(),
    night: z.boolean(),
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
  );
type FormValues = z.infer<typeof Schema>;

const todayIso = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const fmtINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const toNum = (s: string | undefined) => {
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
};

export function TripFormDialog({
  open,
  onOpenChange,
  trip,
  clients,
  vehicles,
  rateCards,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: Trip | null;
  clients: Pick<Client, "id" | "name">[];
  vehicles: Pick<Vehicle, "id" | "number" | "type" | "active">[];
  rateCards: RateCard[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const editing = !!trip;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      date: trip?.date ?? todayIso(),
      end_date: trip?.end_date ?? "",
      client_id: trip?.client_id ?? "",
      vehicle_id: trip?.vehicle_id ?? "",
      car_type: trip?.car_type ?? "Sonet",
      mode: trip?.mode ?? "local",
      billing_method:
        trip?.billing_method ??
        (trip?.mode === "outstation" ? "per_km" : "slab"),
      total_kms: trip ? String(trip.total_kms) : "",
      total_hours: trip ? String(trip.total_hours) : "",
      night: trip?.night ?? false,
      driver_ta: trip ? String(trip.driver_ta) : "0",
      extra_charge_amount:
        trip != null
          ? String(trip.extra_charge_amount || trip.toll || 0)
          : "0",
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
  const formBillingMethod = watch("billing_method") as BillingMethod;
  // Local trips are always slab. Outstation honours the form value.
  const effectiveMethod: BillingMethod =
    mode === "local" ? "slab" : formBillingMethod;
  const night = watch("night");
  const totalKmsStr = watch("total_kms");
  const totalHoursStr = watch("total_hours");
  const driverTaStr = watch("driver_ta");
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

  // Slab billing → look up the LOCAL rate card; per_km → outstation.
  const rateLookupMode: TripMode =
    effectiveMethod === "slab" ? "local" : "outstation";
  const activeRate = useMemo(
    () =>
      rateCards.find(
        (r) =>
          r.client_id === clientId &&
          r.car_type === carType &&
          r.mode === rateLookupMode,
      ),
    [rateCards, clientId, carType, rateLookupMode],
  );

  const preview = useMemo(() => {
    if (!activeRate) return null;
    const lines = tripToLines(
      {
        car_type: carType,
        mode,
        billing_method: effectiveMethod,
        total_kms: toNum(totalKmsStr),
        total_hours: toNum(totalHoursStr),
        night,
        driver_ta: Math.floor(toNum(driverTaStr)),
      },
      activeRate,
    );
    return { lines, total: tripTotal(lines) };
  }, [activeRate, carType, mode, effectiveMethod, totalKmsStr, totalHoursStr, night, driverTaStr]);

  async function onSubmit(values: FormValues) {
    setPending(true);
    const fd = new FormData();
    fd.set("date", values.date);
    fd.set("end_date", values.end_date ?? "");
    fd.set("client_id", values.client_id);
    fd.set("vehicle_id", values.vehicle_id);
    fd.set("car_type", values.car_type);
    fd.set("mode", values.mode);
    fd.set(
      "billing_method",
      values.mode === "local" ? "slab" : values.billing_method,
    );
    fd.set("total_kms", values.total_kms);
    fd.set("total_hours", values.total_hours ?? "0");
    fd.set("night", String(values.night));
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
      onOpenChange(false);
      reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit trip" : "Log trip"}</DialogTitle>
          <DialogDescription>
            One trip per duty. The amount preview uses the active rate card for
            this client + car + mode.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="end_date">
                End date
                <span className="text-xs text-muted-foreground font-normal">
                  {" "}— optional, for multi-day duties
                </span>
              </Label>
              <Input id="end_date" type="date" {...register("end_date")} />
              {errors.end_date && (
                <p className="text-sm text-destructive">{errors.end_date.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select
                value={clientId || undefined}
                onValueChange={(v) => {
                  if (typeof v === "string") {
                    setValue("client_id", v, { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger id="client_id">
                  <SelectValue placeholder="Pick a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && (
                <p className="text-sm text-destructive">{errors.client_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 flex flex-col gap-2">
              <Label htmlFor="vehicle_id">Vehicle *</Label>
              <Select
                value={vehicleId || undefined}
                onValueChange={(v) => {
                  if (typeof v !== "string") return;
                  setValue("vehicle_id", v, { shouldValidate: true });
                  const veh = vehicles.find((x) => x.id === v);
                  if (veh && CAR_TYPES.includes(veh.type)) {
                    setValue("car_type", veh.type, { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger id="vehicle_id">
                  <SelectValue placeholder="Pick a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className={v.active ? "" : "text-muted-foreground"}>
                        {v.number} · {v.type}
                        {v.active ? "" : " (inactive)"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="mode">Mode *</Label>
            <Select
              value={mode}
              onValueChange={(v) => {
                if (v === "local" || v === "outstation") {
                  setValue("mode", v, { shouldValidate: true });
                  // Sensible default when switching modes.
                  if (v === "outstation") {
                    setValue("billing_method", "per_km");
                  } else {
                    setValue("billing_method", "slab");
                  }
                }
              }}
            >
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local (kms + hours)</SelectItem>
                <SelectItem value="outstation">Outstation (per km)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "outstation" && (
            <div className="flex items-start justify-between rounded-md border px-3 py-2 gap-3">
              <div className="min-w-0 flex-1">
                <Label htmlFor="billing_method" className="font-medium">
                  Bill as slab (use local rate card)
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Default for outstation is per-km. Toggle on to bill this
                  trip with the client&apos;s local rate card for{" "}
                  <span className="font-medium">{carType}</span>: base + extra
                  kms + extra hrs + night.
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

          <div className="grid gap-4 sm:grid-cols-3 border rounded-md p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="total_kms" className="text-xs">Total kms *</Label>
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
              <div className="flex flex-col gap-1">
                <Label htmlFor="total_hours" className="text-xs">Total hrs</Label>
                <Input
                  id="total_hours"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  {...register("total_hours")}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="driver_ta" className="text-xs">Driver TA (days)</Label>
              <Input
                id="driver_ta"
                type="number"
                inputMode="numeric"
                {...register("driver_ta")}
              />
            </div>

            {mode === "local" && (
              <div className="sm:col-span-3 flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <Label htmlFor="night" className="font-medium">Night charges</Label>
                  <p className="text-xs text-muted-foreground">
                    Adds the night fee from the rate card.
                  </p>
                </div>
                <Switch
                  id="night"
                  checked={night}
                  onCheckedChange={(v) => setValue("night", v)}
                />
              </div>
            )}
          </div>

          {/* Toll / Tax / Parking block */}
          <div className="flex flex-col gap-3 rounded-md border p-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="extra_charge_amount">
                Toll / Tax / Parking amount ₹
              </Label>
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
                Invoice will read: <span className="font-medium">{liveChargeLabel}</span>
              </p>
            )}

            {showChargeWarning && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  You entered an amount but didn&apos;t tick a box. The invoice
                  will default to <strong>&ldquo;Toll &amp; Parking&rdquo;</strong>.
                </span>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="duty_slip_no" className="text-xs">Duty slip no.</Label>
              <Input id="duty_slip_no" {...register("duty_slip_no")} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="notes" className="text-xs">Notes</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-sm">
            {!clientId || !carType || !mode ? (
              <p className="text-muted-foreground">
                Pick client, car, and mode to preview the amount.
              </p>
            ) : !activeRate ? (
              <p className="text-destructive">
                No <span className="font-medium">{rateLookupMode}</span> rate
                card for this client + {carType}.
                {mode === "outstation" && effectiveMethod === "slab"
                  ? " Slab billing borrows the local rate card — add a local rate for this car type or switch this trip back to per-km."
                  : " Add one on the Rate cards page first."}
              </p>
            ) : preview ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Computed amount
                </p>
                {preview.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-3">
                    <span className="text-muted-foreground whitespace-pre-line">
                      {l.particulars}
                      {l.qty != null && l.rate != null ? ` (${l.qty} × ${fmtINR(l.rate)})` : ""}
                    </span>
                    <span className="font-mono">{fmtINR(l.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-1 mt-1 font-medium">
                  <span>Trip total</span>
                  <span className="font-mono">{fmtINR(preview.total)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  + {fmtINR(extraChargeAmount)} ({liveChargeLabel}) added on the invoice, not here.
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Log trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
        className="h-4 w-4 accent-foreground"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
