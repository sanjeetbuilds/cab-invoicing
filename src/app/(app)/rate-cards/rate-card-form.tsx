"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import type { Client, RateCard, CarType, TripMode } from "@/lib/supabase/types";
import { createRateCardAction, updateRateCardAction } from "./actions";

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];

const Schema = z.object({
  client_id: z.string().min(1, "Pick a client."),
  car_type: z.enum(CAR_TYPES),
  mode: z.enum(["local", "outstation"]),
  base_rate: z.string().optional(),
  base_kms: z.string().optional(),
  base_hours: z.string().optional(),
  extra_km: z.string().optional(),
  extra_hour: z.string().optional(),
  night: z.string().optional(),
  per_km: z.string().optional(),
  driver_ta: z.string().optional(),
});
type FormValues = z.infer<typeof Schema>;

function toStr(n: number | null | undefined) {
  return n == null ? "" : String(n);
}

export function RateCardForm({
  rateCard,
  clients,
  defaultClientId,
}: {
  rateCard?: RateCard | null;
  clients: Pick<Client, "id" | "name">[];
  defaultClientId?: string;
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
      car_type: rateCard?.car_type ?? "Dzire",
      mode: rateCard?.mode ?? "local",
      base_rate:  toStr(rateCard?.base_rate),
      base_kms:   toStr(rateCard?.base_kms ?? 80),
      base_hours: toStr(rateCard?.base_hours ?? 8),
      extra_km:   toStr(rateCard?.extra_km),
      extra_hour: toStr(rateCard?.extra_hour),
      night:      toStr(rateCard?.night),
      per_km:     toStr(rateCard?.per_km),
      driver_ta:  toStr(rateCard?.driver_ta ?? 300),
    },
  });

  const clientId = watch("client_id");
  const carType = watch("car_type");
  const mode = watch("mode") as TripMode;

  async function onSubmit(values: FormValues) {
    setPending(true);
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.set(k, v ?? ""));

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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <div className="sm:col-span-3 flex flex-col gap-2">
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

          <div className="sm:col-span-2 flex flex-col gap-2">
            <Label htmlFor="mode">Mode *</Label>
            <Select
              value={mode}
              onValueChange={(v) => {
                if (v === "local" || v === "outstation") {
                  setValue("mode", v, { shouldValidate: true });
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
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-3">
            {mode === "local" ? "Local rates" : "Outstation rates"}
          </p>
          {mode === "local" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Base rate ₹" id="base_rate" register={register("base_rate")} />
              <Field label="Base kms"    id="base_kms"   register={register("base_kms")} />
              <Field label="Base hours"  id="base_hours" register={register("base_hours")} />
              <Field label="Extra km ₹"  id="extra_km"   register={register("extra_km")} />
              <Field label="Extra hour ₹" id="extra_hour" register={register("extra_hour")} />
              <Field label="Night ₹"     id="night"      register={register("night")} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Per km ₹" id="per_km" register={register("per_km")} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Driver TA ₹ / day" id="driver_ta" register={register("driver_ta")} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/rate-cards")}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Save changes" : "Add rate card"}
        </Button>
      </div>
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} type="number" inputMode="decimal" step="any" {...register} />
    </div>
  );
}
