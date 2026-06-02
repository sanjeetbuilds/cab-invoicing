"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
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

/**
 * Rate-card editor opened from inside the trip form. Renders as a
 * Sheet (bottom on mobile, right-side panel on desktop) so the
 * trip draft underneath stays mounted and intact. Save lives in the
 * sheet's sticky footer, so it stays visible above the soft
 * keyboard on mobile.
 *
 * Important: no inner <form> element. The outer trip page is one
 * big <form>, and nested forms are invalid HTML, an inner submit
 * bubbles up and submits the trip prematurely. All buttons here
 * are type="button" and Save runs the action directly.
 */
export function InlineRateCardForm({
  open,
  onOpenChange,
  clientId,
  clientName,
  carType,
  mode,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  carType: CarType;
  mode: TripMode;
  /** When provided, the panel acts as Edit: pre-fills and uses the update RPC. */
  existing?: RateCard | null;
  onSaved: (rateCard: RateCard) => void;
}) {
  const [state, setState] = useState<RateCardFormState>(() =>
    initialState(existing ?? null, mode),
  );
  const [pending, setPending] = useState(false);
  const isFixed = mode === "transfer" || mode === "package";
  const isEditing = !!existing;

  // Re-seed the form values every time the sheet opens, so a fresh
  // open never carries stale values from a previous edit session.
  useEffect(() => {
    if (open) {
      setState(initialState(existing ?? null, mode));
      setPending(false);
    }
  }, [open, existing, mode]);

  function patch<K extends keyof RateCardFormState>(
    key: K,
    value: RateCardFormState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function onSave() {
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
      `Rate saved for ${clientName}, ${carType}, ${modeLabel(mode)}.`,
    );
    onSaved(lookup.rateCard);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit rate card" : "Add rate card"}
      contextLine={
        <>
          <span className="font-medium text-foreground/80">{clientName}</span>
          {" · "}
          <span className="font-medium text-foreground/80">{carType}</span>
          {" · "}
          <span className="font-medium text-foreground/80">{modeLabel(mode)}</span>
        </>
      }
      footer={
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Save changes" : "Save rate and apply"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
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
      </div>
    </Sheet>
  );
}

function modeLabel(mode: TripMode) {
  return mode === "local"
    ? "Local"
    : mode === "outstation"
      ? "Outstation"
      : mode === "transfer"
        ? "Transfer"
        : "Package";
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
