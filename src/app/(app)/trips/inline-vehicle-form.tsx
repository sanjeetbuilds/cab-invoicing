"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

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
import type { CarType, Vehicle } from "@/lib/supabase/types";
import { normalizeVehicleNumber } from "@/lib/vehicle-format";
import {
  createVehicleAction,
  fetchVehicleByNumberAction,
} from "../vehicles/actions";

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];

interface State {
  number: string;
  type: CarType;
  ownership: "own" | "attached";
  vendor_name: string;
}

export function InlineVehicleForm({
  defaultNumber = "",
  defaultOwnership = "attached",
  onCancel,
  onCreated,
}: {
  /** Pre-fill the number field, typed text from the picker. */
  defaultNumber?: string;
  /** Quick invoice flow wants "attached" by default (vendor cars). */
  defaultOwnership?: "own" | "attached";
  onCancel: () => void;
  onCreated: (vehicle: Pick<Vehicle, "id" | "number" | "type" | "active">) => void;
}) {
  const [state, setState] = useState<State>({
    number: normalizeVehicleNumber(defaultNumber),
    type: "Dzire",
    ownership: defaultOwnership,
    vendor_name: "",
  });
  const [pending, setPending] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const number = normalizeVehicleNumber(state.number);
    if (!number) {
      toast.error("Vehicle number is required.");
      return;
    }
    // Sometimes the user only has the last 4 digits (the visible part on
    // the cab). Allow it but flag the missing structure, easier to
    // amend later than block the trip-entry flow.
    if (/^\d{1,4}$/.test(number.replace(/\s+/g, ""))) {
      toast.warning(
        "Vehicle number looks incomplete. Use full format HR 26 ED 9083 for cleaner records.",
      );
    }
    setPending(true);
    const fd = new FormData();
    fd.set("number", number);
    fd.set("type", state.type);
    fd.set("ownership", state.ownership);
    fd.set("vendor_name", state.vendor_name);
    fd.set("active", "true");
    const result = await createVehicleAction(fd);
    if (!result.ok) {
      toast.error(result.error);
      setPending(false);
      return;
    }
    // Fetch the row we just created so the parent can select it.
    const lookup = await fetchVehicleByNumberAction(number);
    setPending(false);
    if (!lookup.ok) {
      toast.error(lookup.error);
      return;
    }
    toast.success(`${lookup.vehicle.number} added.`);
    onCreated(lookup.vehicle);
  }

  return (
    <Card className="border-dashed border-accent-foreground/40 bg-accent-soft/30">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Add new vehicle</p>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-col gap-2">
            <Label htmlFor="iv-number">Vehicle number *</Label>
            <Input
              id="iv-number"
              placeholder="HR 26 ED 9083"
              className="font-mono uppercase"
              autoCapitalize="characters"
              value={state.number}
              onChange={(e) =>
                setState({
                  ...state,
                  number: normalizeVehicleNumber(e.target.value),
                })
              }
              onBlur={(e) =>
                setState({
                  ...state,
                  number: normalizeVehicleNumber(e.target.value),
                })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="iv-type">Type *</Label>
            <Select
              value={state.type}
              onValueChange={(v) =>
                typeof v === "string" &&
                setState({ ...state, type: v as CarType })
              }
            >
              <SelectTrigger id="iv-type">
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
            <Label htmlFor="iv-ownership">Ownership *</Label>
            <Select
              value={state.ownership}
              onValueChange={(v) =>
                (v === "own" || v === "attached") &&
                setState({ ...state, ownership: v })
              }
            >
              <SelectTrigger id="iv-ownership">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="own">Own</SelectItem>
                <SelectItem value="attached">Attached</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state.ownership === "attached" && (
            <div className="sm:col-span-2 flex flex-col gap-2">
              <Label htmlFor="iv-vendor">Vendor name</Label>
              <Input
                id="iv-vendor"
                value={state.vendor_name}
                onChange={(e) =>
                  setState({ ...state, vendor_name: e.target.value })
                }
              />
            </div>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Save &amp; select
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
