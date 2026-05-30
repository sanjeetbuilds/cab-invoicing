"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CarType, RateCard, TripMode } from "@/lib/supabase/types";
import {
  createRateCardAction,
  fetchRateCardAction,
} from "../rate-cards/actions";

interface RateCardFormState {
  base_rate: string;
  base_kms: string;
  base_hours: string;
  extra_km: string;
  extra_hour: string;
  night: string;
  per_km: string;
  driver_ta: string;
}

const defaults: RateCardFormState = {
  base_rate: "1500",
  base_kms: "80",
  base_hours: "8",
  extra_km: "15",
  extra_hour: "100",
  night: "300",
  per_km: "",
  driver_ta: "300",
};

export function InlineRateCardForm({
  clientId,
  clientName,
  carType,
  mode,
  onCancel,
  onCreated,
}: {
  clientId: string;
  clientName: string;
  carType: CarType;
  mode: TripMode;
  onCancel: () => void;
  onCreated: (rateCard: RateCard) => void;
}) {
  const [state, setState] = useState<RateCardFormState>(defaults);
  const [pending, setPending] = useState(false);
  const isLocal = mode === "local";

  function patch(key: keyof RateCardFormState, value: string) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData();
    fd.set("client_id", clientId);
    fd.set("car_type", carType);
    fd.set("mode", mode);
    fd.set("base_rate", state.base_rate);
    fd.set("base_kms", state.base_kms);
    fd.set("base_hours", state.base_hours);
    fd.set("extra_km", state.extra_km);
    fd.set("extra_hour", state.extra_hour);
    fd.set("night", state.night);
    fd.set("per_km", state.per_km);
    fd.set("driver_ta", state.driver_ta);
    // Inline flow only supports local/outstation. Transfer/Package go
    // through the full Rate Cards page form.
    fd.set("plan_name", "");
    fd.set("fixed_price", "");
    fd.set("includes_toll", "false");
    fd.set("includes_tax", "false");
    fd.set("includes_parking", "false");
    fd.set("notes", "");

    const result = await createRateCardAction(fd);
    if (!result.ok) {
      toast.error(result.error);
      setPending(false);
      return;
    }
    const lookup = await fetchRateCardAction({
      client_id: clientId,
      car_type: carType,
      mode,
    });
    setPending(false);
    if (!lookup.ok) {
      toast.error(lookup.error);
      return;
    }
    toast.success(
      `Rate card saved for ${clientName} · ${carType} · ${mode}.`,
    );
    onCreated(lookup.rateCard);
  }

  return (
    <Card className="border-dashed border-accent-foreground/40 bg-accent-soft/30">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Add rate card
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {clientName} · {carType} ·{" "}
              <span className="font-medium">{mode}</span>
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>

        <form onSubmit={onSave} className="flex flex-col gap-4">
          {isLocal ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field
                label="Base rate ₹"
                value={state.base_rate}
                onChange={(v) => patch("base_rate", v)}
              />
              <Field
                label="Base kms"
                value={state.base_kms}
                onChange={(v) => patch("base_kms", v)}
              />
              <Field
                label="Base hours"
                value={state.base_hours}
                onChange={(v) => patch("base_hours", v)}
              />
              <Field
                label="Extra km ₹"
                value={state.extra_km}
                onChange={(v) => patch("extra_km", v)}
              />
              <Field
                label="Extra hour ₹"
                value={state.extra_hour}
                onChange={(v) => patch("extra_hour", v)}
              />
              <Field
                label="Night ₹"
                value={state.night}
                onChange={(v) => patch("night", v)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Per km ₹"
                value={state.per_km}
                onChange={(v) => patch("per_km", v)}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Driver TA ₹ / day"
              value={state.driver_ta}
              onChange={(v) => patch("driver_ta", v)}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Save &amp; apply
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
