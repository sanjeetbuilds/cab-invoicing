"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CarType, RateCard, TripMode } from "@/lib/supabase/types";
import {
  createRateCardAction,
  fetchRateCardAction,
  updateRateCardAction,
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
  plan_name: string;
  fixed_price: string;
  includes_toll: boolean;
  includes_tax: boolean;
  includes_parking: boolean;
  notes: string;
}

function initialState(existing: RateCard | null, mode: TripMode): RateCardFormState {
  const isFixed = mode === "transfer" || mode === "package";
  return {
    base_rate: existing?.base_rate != null ? String(existing.base_rate) : (mode === "local" ? "1500" : ""),
    base_kms: existing?.base_kms != null ? String(existing.base_kms) : "80",
    base_hours: existing?.base_hours != null ? String(existing.base_hours) : "8",
    extra_km: existing?.extra_km != null ? String(existing.extra_km) : (mode === "local" ? "15" : ""),
    extra_hour: existing?.extra_hour != null ? String(existing.extra_hour) : (mode === "local" ? "100" : ""),
    night: existing?.night != null ? String(existing.night) : (mode === "local" ? "300" : ""),
    per_km: existing?.per_km != null ? String(existing.per_km) : "",
    driver_ta:
      existing?.driver_ta != null
        ? String(existing.driver_ta)
        : isFixed
          ? "0"
          : "300",
    plan_name: existing?.plan_name ?? "",
    fixed_price: existing?.fixed_price != null ? String(existing.fixed_price) : "",
    includes_toll: existing?.includes_toll ?? false,
    includes_tax: existing?.includes_tax ?? false,
    includes_parking: existing?.includes_parking ?? false,
    notes: existing?.notes ?? "",
  };
}

export function InlineRateCardForm({
  clientId,
  clientName,
  carType,
  mode,
  existing,
  onCancel,
  onCreated,
}: {
  clientId: string;
  clientName: string;
  carType: CarType;
  mode: TripMode;
  /** When provided, the panel acts as Edit: pre-fills + uses update RPC. */
  existing?: RateCard | null;
  onCancel: () => void;
  onCreated: (rateCard: RateCard) => void;
}) {
  const [state, setState] = useState<RateCardFormState>(() =>
    initialState(existing ?? null, mode),
  );
  const [pending, setPending] = useState(false);
  const isFixed = mode === "transfer" || mode === "package";
  const isEditing = !!existing;

  function patch<K extends keyof RateCardFormState>(
    key: K,
    value: RateCardFormState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (isFixed && !state.plan_name.trim()) {
      toast.error("Plan name is required.");
      return;
    }
    if (isFixed && !state.fixed_price.trim()) {
      toast.error("Fixed price is required.");
      return;
    }

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
    fd.set("plan_name", state.plan_name);
    fd.set("fixed_price", state.fixed_price);
    fd.set("includes_toll", state.includes_toll ? "true" : "false");
    fd.set("includes_tax", state.includes_tax ? "true" : "false");
    fd.set("includes_parking", state.includes_parking ? "true" : "false");
    fd.set("notes", state.notes);

    const result = isEditing
      ? await updateRateCardAction(existing!.id, fd)
      : await createRateCardAction(fd);
    if (!result.ok) {
      toast.error(result.error);
      setPending(false);
      return;
    }
    const lookup = await fetchRateCardAction({
      client_id: clientId,
      car_type: carType,
      mode,
      plan_name: isFixed ? state.plan_name.trim() : null,
    });
    setPending(false);
    if (!lookup.ok) {
      toast.error(lookup.error);
      return;
    }
    toast.success(
      `Rate saved for ${clientName} · ${carType} · ${mode}.`,
    );
    onCreated(lookup.rateCard);
  }

  const modeLabel =
    mode === "local"
      ? "Local"
      : mode === "outstation"
        ? "Outstation"
        : mode === "transfer"
          ? "Transfer"
          : "Package";

  return (
    <Card className="border-dashed border-accent-foreground/40 bg-accent-soft/30">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isEditing ? "Edit rate card" : "Add rate card"}
            </p>
            {/* Locked context: this rate card is for THIS client/car/mode
                only. User must cancel out and reopen to change scope. */}
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">{clientName}</span> ·{" "}
              <span className="font-medium">{carType}</span> ·{" "}
              <span className="font-medium">{modeLabel}</span>
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
          {mode === "local" && (
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
          )}

          {mode === "outstation" && (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Per km ₹"
                value={state.per_km}
                onChange={(v) => patch("per_km", v)}
              />
            </div>
          )}

          {isFixed && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Plan name *</Label>
                  <Input
                    value={state.plan_name}
                    onChange={(e) => patch("plan_name", e.target.value)}
                    placeholder={
                      mode === "transfer"
                        ? "e.g. Airport T3 Drop"
                        : "e.g. Manali 3D2N"
                    }
                  />
                </div>
                <Field
                  label="Fixed price ₹ *"
                  value={state.fixed_price}
                  onChange={(v) => patch("fixed_price", v)}
                />
              </div>
              {mode === "package" && (
                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Price includes</Label>
                  <div className="flex flex-wrap gap-3">
                    <Toggle
                      checked={state.includes_toll}
                      onChange={(v) => patch("includes_toll", v)}
                      label="Toll"
                    />
                    <Toggle
                      checked={state.includes_tax}
                      onChange={(v) => patch("includes_tax", v)}
                      label="Tax"
                    />
                    <Toggle
                      checked={state.includes_parking}
                      onChange={(v) => patch("includes_parking", v)}
                      label="Parking"
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  rows={2}
                  value={state.notes}
                  onChange={(e) => patch("notes", e.target.value)}
                  placeholder={
                    mode === "package"
                      ? "Conditions, e.g. Up to 250km/day, extra km @ ₹15"
                      : "Conditions, e.g. one-way only"
                  }
                />
              </div>
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
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Save rate & continue"}
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
    <div className="flex flex-col gap-2">
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
