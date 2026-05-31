"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { SaveBar, SaveBarSpacer } from "@/components/shell/save-bar";
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
import type { Client, RateCard, CarType, TripMode } from "@/lib/supabase/types";
import { createRateCardAction, updateRateCardAction } from "./actions";

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];
const MODES: TripMode[] = ["local", "outstation", "transfer", "package"];

// Built-in suggestions shown on first use of plan_name when the user
// hasn't yet created any Transfer plans. Autocomplete only, the user
// can type anything.
const TRANSFER_SUGGESTIONS = [
  "Airport T1 Drop",
  "Airport T2 Drop",
  "Airport T3 Drop",
  "Airport Pickup",
  "New Delhi Railway Station",
  "Old Delhi Railway Station",
  "Hazrat Nizamuddin Station",
];

const Schema = z.object({
  client_id: z.string().min(1, "Pick a client."),
  car_type: z.enum(CAR_TYPES),
  mode: z.enum(MODES),
  base_rate: z.string().optional(),
  base_kms: z.string().optional(),
  base_hours: z.string().optional(),
  extra_km: z.string().optional(),
  extra_hour: z.string().optional(),
  night: z.string().optional(),
  per_km: z.string().optional(),
  driver_ta: z.string().optional(),
  plan_name: z.string().optional(),
  fixed_price: z.string().optional(),
  includes_toll: z.boolean().optional(),
  includes_tax: z.boolean().optional(),
  includes_parking: z.boolean().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof Schema>;

function toStr(n: number | null | undefined) {
  return n == null ? "" : String(n);
}

function defaultDriverTaForMode(m: TripMode): number {
  // Transfer / Package usually fold TA into the fixed price.
  return m === "transfer" || m === "package" ? 0 : 300;
}

function modeLabel(m: TripMode): string {
  switch (m) {
    case "local": return "Local (kms + hours)";
    case "outstation": return "Outstation (per km)";
    case "transfer": return "Transfer (fixed price)";
    case "package": return "Package (fixed price)";
  }
}

export function RateCardForm({
  rateCard,
  clients,
  defaultClientId,
  defaultCarType,
  defaultMode,
  planNameHistory,
}: {
  rateCard?: RateCard | null;
  clients: Pick<Client, "id" | "name">[];
  defaultClientId?: string;
  defaultCarType?: CarType;
  defaultMode?: TripMode;
  /** Plan names previously used in this company's rate cards. */
  planNameHistory?: string[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const editing = !!rateCard;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      client_id: rateCard?.client_id ?? defaultClientId ?? "",
      car_type: rateCard?.car_type ?? defaultCarType ?? "Dzire",
      mode: rateCard?.mode ?? defaultMode ?? "local",
      base_rate:  toStr(rateCard?.base_rate),
      base_kms:   toStr(rateCard?.base_kms ?? 80),
      base_hours: toStr(rateCard?.base_hours ?? 8),
      extra_km:   toStr(rateCard?.extra_km),
      extra_hour: toStr(rateCard?.extra_hour),
      night:      toStr(rateCard?.night),
      per_km:     toStr(rateCard?.per_km),
      driver_ta: toStr(
        rateCard?.driver_ta ??
          defaultDriverTaForMode(rateCard?.mode ?? defaultMode ?? "local"),
      ),
      plan_name:  rateCard?.plan_name ?? "",
      fixed_price: toStr(rateCard?.fixed_price),
      includes_toll: rateCard?.includes_toll ?? false,
      includes_tax: rateCard?.includes_tax ?? false,
      includes_parking: rateCard?.includes_parking ?? false,
      notes: rateCard?.notes ?? "",
    },
  });

  const clientId = watch("client_id");
  const carType = watch("car_type");
  const mode = watch("mode") as TripMode;

  // When the user switches mode, sync Driver TA to the new mode's
  // canonical default, but only if the field is still on a canonical
  // value (0 or 300). User-typed numbers stay untouched. Skip the first
  // run so initial defaults aren't overwritten on mount.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const current = (watch("driver_ta") ?? "").trim();
    if (current === "" || current === "0" || current === "300") {
      setValue("driver_ta", String(defaultDriverTaForMode(mode)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  const includesToll = watch("includes_toll") ?? false;
  const includesTax = watch("includes_tax") ?? false;
  const includesParking = watch("includes_parking") ?? false;

  const isFixed = mode === "transfer" || mode === "package";
  const suggestions = mode === "transfer"
    ? Array.from(new Set([...(planNameHistory ?? []), ...TRANSFER_SUGGESTIONS]))
    : (planNameHistory ?? []);

  async function onSubmit(values: FormValues) {
    setPending(true);
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (typeof v === "boolean") fd.set(k, v ? "true" : "false");
      else fd.set(k, v ?? "");
    });

    const result = editing
      ? await updateRateCardAction(rateCard!.id, fd)
      : await createRateCardAction(fd);

    if (result.ok) {
      toast.success(editing ? "Rate card saved." : "Rate card added.");
      router.push("/rate-cards");
      router.refresh();
    } else {
      toast.error(result.error);
      setPending(false);
    }
  }

  return (
    <form
      id="rate-card-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1 flex flex-col gap-2">
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
            {errors.client_id && (
              <p className="text-sm text-destructive">{errors.client_id.message}</p>
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="mode">Mode *</Label>
            <Select
              value={mode}
              onValueChange={(v) => {
                if (
                  v === "local" ||
                  v === "outstation" ||
                  v === "transfer" ||
                  v === "package"
                ) {
                  setValue("mode", v, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="mode">
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
        </CardContent>
      </Card>

      {/* Per-mode fields. Mobile keeps everything stacked; md+ uses
          horizontal rows of 3-4. Driver TA folds into each mode card so
          we don't ship a trailing single-field card. */}
      {mode === "local" && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Local rates
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Base rate ₹" id="base_rate" register={register("base_rate")} />
              <Field label="Base kms"    id="base_kms"   register={register("base_kms")} />
              <Field label="Base hours"  id="base_hours" register={register("base_hours")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Extra km ₹"  id="extra_km"   register={register("extra_km")} />
              <Field label="Extra hour ₹" id="extra_hour" register={register("extra_hour")} />
              <Field label="Night ₹"     id="night"      register={register("night")} />
              <Field label="Driver TA ₹ / day" id="driver_ta" register={register("driver_ta")} />
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "outstation" && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Outstation rates
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Per km ₹" id="per_km" register={register("per_km")} />
              <Field label="Driver TA ₹ / day" id="driver_ta" register={register("driver_ta")} />
            </div>
          </CardContent>
        </Card>
      )}

      {isFixed && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              {mode === "transfer" ? "Transfer plan" : "Package plan"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="plan_name" className="text-xs">Plan name *</Label>
                <Input
                  id="plan_name"
                  list="rate-card-plan-suggestions"
                  placeholder={
                    mode === "transfer"
                      ? "e.g. Airport T3 Drop"
                      : "e.g. Manali 3D2N"
                  }
                  autoComplete="off"
                  {...register("plan_name")}
                />
                <datalist id="rate-card-plan-suggestions">
                  {suggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <Field
                label="Fixed price ₹ *"
                id="fixed_price"
                register={register("fixed_price")}
              />
              <Field
                label="Driver TA ₹ / day"
                id="driver_ta"
                register={register("driver_ta")}
              />
            </div>

            {mode === "package" && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <Label className="text-xs">Price includes</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
                  <CheckboxLabel
                    id="includes_toll"
                    checked={includesToll}
                    onChange={(v) => setValue("includes_toll", v)}
                    label="Toll"
                  />
                  <CheckboxLabel
                    id="includes_tax"
                    checked={includesTax}
                    onChange={(v) => setValue("includes_tax", v)}
                    label="Tax"
                  />
                  <CheckboxLabel
                    id="includes_parking"
                    checked={includesParking}
                    onChange={(v) => setValue("includes_parking", v)}
                    label="Parking"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Trip-level toll / tax / parking is still added on top of the
                  fixed price when entered, these flags only inform the
                  driver that the agreement covers them.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes" className="text-xs">
                Notes
              </Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder={
                  mode === "package"
                    ? "Conditions, e.g. Up to 250km/day, extra km @ ₹15"
                    : "Conditions, e.g. one-way only, max 2 hr wait"
                }
                {...register("notes")}
              />
              <p className="text-xs text-muted-foreground">Optional.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <SaveBarSpacer />
      <SaveBar
        formId="rate-card-form"
        pending={pending}
        onCancel={() => router.push("/rate-cards")}
        saveLabel={editing ? "Save changes" : "Add rate card"}
      />
    </form>
  );
}

function Field({
  label,
  id,
  register,
}: {
  label: string;
  id: string;
  register: UseFormRegisterReturn;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} type="number" inputMode="decimal" step="any" {...register} />
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
