"use client";

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CarType, Client, RateCard } from "@/lib/supabase/types";
import {
  createRateCardAction,
  deleteRateCardAction,
  fetchRateCardAction,
  updateRateCardAction,
} from "./actions";

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];

interface LocalState {
  id?: string;
  base_rate: string;
  base_kms: string;
  base_hours: string;
  extra_km: string;
  extra_hour: string;
  night: string;
  driver_ta: string;
}

interface OutstationState {
  id?: string;
  per_km: string;
  driver_ta: string;
}

interface PackageState {
  id?: string;
  /** Preserve original mode for existing rows so a stored "transfer"
   *  is not silently flipped to "package" on save. New rows always
   *  save as "package". */
  mode: "transfer" | "package";
  plan_name: string;
  fixed_price: string;
  /** Existing transfer/package rows may have a driver_ta we want to
   *  preserve on round-trip. Hidden from the UI for new rows. */
  driver_ta: string;
  /** Marks an existing row pending deletion on next save. */
  removed?: boolean;
}

function toStr(n: number | null | undefined): string {
  return n == null ? "" : String(n);
}

function initialLocal(rc?: RateCard): LocalState {
  return {
    id: rc?.id,
    base_rate: toStr(rc?.base_rate),
    base_kms: toStr(rc?.base_kms ?? 80),
    base_hours: toStr(rc?.base_hours ?? 8),
    extra_km: toStr(rc?.extra_km),
    extra_hour: toStr(rc?.extra_hour),
    night: toStr(rc?.night),
    driver_ta: toStr(rc?.driver_ta ?? 300),
  };
}

function initialOutstation(rc?: RateCard): OutstationState {
  return {
    id: rc?.id,
    per_km: toStr(rc?.per_km),
    driver_ta: toStr(rc?.driver_ta ?? 300),
  };
}

function initialPackages(rcs: RateCard[]): PackageState[] {
  return rcs.map((r) => ({
    id: r.id,
    mode: (r.mode === "transfer" ? "transfer" : "package"),
    plan_name: r.plan_name ?? "",
    fixed_price: toStr(r.fixed_price),
    driver_ta: toStr(r.driver_ta ?? 0),
  }));
}

export interface RateBundleSaveResult {
  saved: RateCard[];
  deletedIds: string[];
}

export interface RateBundleEditorHandle {
  /** Saves all sections that have data. Returns the saved rate
   *  cards plus the ids of any packages that were deleted, so the
   *  caller can keep its local state in sync. Returns null if any
   *  upsert/delete failed. Returns { saved: [], deletedIds: [] }
   *  when nothing was filled, which is not an error. */
  save: () => Promise<RateBundleSaveResult | null>;
}

interface Props {
  /** Pre-selected client. When provided, the client picker is
   *  hidden (we are already scoped to one client). When null /
   *  undefined, the editor renders a client picker at the top. */
  clientId?: string;
  /** Required for label / toast text whenever clientId is set. */
  clientName?: string;
  /** Same idea for car type: when provided, the picker is hidden. */
  carType?: CarType;
  /** Optional list of clients used by the inline client picker on
   *  the /rate-cards/new page where the user has not yet chosen
   *  who the bundle is for. */
  clients?: Pick<Client, "id" | "name">[];
  /** Existing rate_cards rows for the (client, car) combo, so the
   *  editor can pre-fill itself and reuse ids on save. */
  existing: RateCard[];
}

/**
 * Edits the three optional kinds of rates per (client, car) combo
 * in one panel: Local, Outstation, and any number of named
 * Packages. Each section is optional. On save, every filled
 * section becomes one rate_cards row, package rows are upserted by
 * id, and packages the user removed in the editor are deleted on
 * the server.
 *
 * Save is exposed via a forwarded ref so the caller (a Sheet on
 * the trip form, a SaveBar on /rate-cards) can wire its own
 * primary action without dragging form submit semantics.
 */
export const RateBundleEditor = forwardRef<RateBundleEditorHandle, Props>(
  function RateBundleEditor(
    { clientId: initialClientId, clientName: initialClientName, carType: initialCarType, clients, existing },
    ref,
  ) {
    const [clientId, setClientId] = useState<string>(initialClientId ?? "");
    const [carType, setCarType] = useState<CarType>(initialCarType ?? "Dzire");

    const showClientPicker = !initialClientId;
    const showCarTypePicker = !initialCarType;

    const clientName = useMemo(() => {
      if (initialClientName) return initialClientName;
      const found = clients?.find((c) => c.id === clientId);
      return found?.name ?? "this client";
    }, [initialClientName, clients, clientId]);

    const existingLocal = useMemo(
      () => existing.find((r) => r.mode === "local"),
      [existing],
    );
    const existingOutstation = useMemo(
      () => existing.find((r) => r.mode === "outstation"),
      [existing],
    );
    const existingPackages = useMemo(
      () =>
        existing.filter(
          (r) => r.mode === "transfer" || r.mode === "package",
        ),
      [existing],
    );

    const [local, setLocal] = useState<LocalState>(() => initialLocal(existingLocal));
    const [outstation, setOutstation] = useState<OutstationState>(() => initialOutstation(existingOutstation));
    const [packages, setPackages] = useState<PackageState[]>(() => initialPackages(existingPackages));

    function patchLocal<K extends keyof LocalState>(key: K, value: LocalState[K]) {
      setLocal((s) => ({ ...s, [key]: value }));
    }
    function patchOutstation<K extends keyof OutstationState>(key: K, value: OutstationState[K]) {
      setOutstation((s) => ({ ...s, [key]: value }));
    }
    function patchPackage(idx: number, patch: Partial<PackageState>) {
      setPackages((prev) => {
        const next = prev.slice();
        next[idx] = { ...next[idx], ...patch };
        return next;
      });
    }
    function addPackage() {
      setPackages((prev) => [
        ...prev,
        { mode: "package", plan_name: "", fixed_price: "", driver_ta: "0" },
      ]);
    }
    function removePackage(idx: number) {
      setPackages((prev) => {
        const next = prev.slice();
        const row = next[idx];
        if (row.id) {
          // Existing row, mark for delete-on-save instead of just
          // dropping locally so a partial save still reflects intent.
          next[idx] = { ...row, removed: true };
        } else {
          next.splice(idx, 1);
        }
        return next;
      });
    }

    async function save(): Promise<RateBundleSaveResult | null> {
      if (!clientId) {
        toast.error("Pick a client first.");
        return null;
      }
      const upserts: Array<{
        id?: string;
        formData: FormData;
        lookup: {
          client_id: string;
          car_type: CarType;
          mode: "local" | "outstation" | "transfer" | "package";
          plan_name?: string | null;
        };
      }> = [];
      const deletes: string[] = [];

      // Local section: save if there was an existing row or the user
      // has typed at least one numeric value.
      const localFilled =
        local.base_rate.trim() !== "" ||
        local.extra_km.trim() !== "" ||
        local.extra_hour.trim() !== "" ||
        local.night.trim() !== "";
      if (existingLocal || localFilled) {
        const fd = new FormData();
        fd.set("client_id", clientId);
        fd.set("car_type", carType);
        fd.set("mode", "local");
        fd.set("base_rate", local.base_rate);
        fd.set("base_kms", local.base_kms);
        fd.set("base_hours", local.base_hours);
        fd.set("extra_km", local.extra_km);
        fd.set("extra_hour", local.extra_hour);
        fd.set("night", local.night);
        fd.set("driver_ta", local.driver_ta);
        upserts.push({
          id: local.id,
          formData: fd,
          lookup: { client_id: clientId, car_type: carType, mode: "local", plan_name: null },
        });
      }

      // Outstation section.
      const outstationFilled = outstation.per_km.trim() !== "";
      if (existingOutstation || outstationFilled) {
        const fd = new FormData();
        fd.set("client_id", clientId);
        fd.set("car_type", carType);
        fd.set("mode", "outstation");
        fd.set("per_km", outstation.per_km);
        fd.set("driver_ta", outstation.driver_ta);
        upserts.push({
          id: outstation.id,
          formData: fd,
          lookup: { client_id: clientId, car_type: carType, mode: "outstation", plan_name: null },
        });
      }

      // Packages: each row needs both name and price to count.
      // Removed existing rows get deleted server-side.
      for (const p of packages) {
        if (p.removed) {
          if (p.id) deletes.push(p.id);
          continue;
        }
        const name = p.plan_name.trim();
        const price = p.fixed_price.trim();
        if (!name || !price) continue;
        const fd = new FormData();
        fd.set("client_id", clientId);
        fd.set("car_type", carType);
        fd.set("mode", p.mode);
        fd.set("plan_name", name);
        fd.set("fixed_price", price);
        fd.set("driver_ta", p.driver_ta || "0");
        upserts.push({
          id: p.id,
          formData: fd,
          lookup: { client_id: clientId, car_type: carType, mode: p.mode, plan_name: name },
        });
      }

      if (upserts.length === 0 && deletes.length === 0) {
        toast.info("Nothing to save yet. Fill at least one section.");
        return { saved: [], deletedIds: [] };
      }

      const [upsertResults, deleteResults] = await Promise.all([
        Promise.all(
          upserts.map(async (u) => {
            const action = u.id
              ? await updateRateCardAction(u.id, u.formData)
              : await createRateCardAction(u.formData);
            if (!action.ok) {
              return { ok: false as const, error: action.error };
            }
            const fetched = await fetchRateCardAction(u.lookup);
            if (!fetched.ok) {
              return { ok: false as const, error: fetched.error };
            }
            return { ok: true as const, rateCard: fetched.rateCard };
          }),
        ),
        Promise.all(
          deletes.map(async (id) => {
            const r = await deleteRateCardAction(id);
            return { ok: r.ok, id };
          }),
        ),
      ]);

      const failedUpsert = upsertResults.find((r) => !r.ok);
      if (failedUpsert && !failedUpsert.ok) {
        toast.error(failedUpsert.error);
        return null;
      }
      const failedDelete = deleteResults.find((r) => !r.ok);
      if (failedDelete) {
        toast.error("One package could not be removed.");
        return null;
      }

      const saved = upsertResults
        .filter((r): r is { ok: true; rateCard: RateCard } => r.ok)
        .map((r) => r.rateCard);
      toast.success(
        `Rates saved for ${clientName}, ${carType}.`,
      );
      return { saved, deletedIds: deletes };
    }

    useImperativeHandle(ref, () => ({ save }));

    const visiblePackages = packages
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => !p.removed);

    return (
      <div className="flex flex-col gap-6">
        {(showClientPicker || showCarTypePicker) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {showClientPicker && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Client *</Label>
                <Select
                  value={clientId || undefined}
                  onValueChange={(v) => typeof v === "string" && setClientId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a client">
                      {(value) =>
                        typeof value === "string" && value
                          ? (clients?.find((c) => c.id === value)?.name ?? null)
                          : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(clients ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showCarTypePicker && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Car type *</Label>
                <Select
                  value={carType}
                  onValueChange={(v) =>
                    typeof v === "string" && setCarType(v as CarType)
                  }
                >
                  <SelectTrigger>
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
            )}
          </div>
        )}

        <Section
          title="Local rates"
          subtitle="Optional. For trips inside the city, billed as a base plus extras."
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumberField label="Base rate ₹" value={local.base_rate} onChange={(v) => patchLocal("base_rate", v)} />
            <NumberField label="Base kms" value={local.base_kms} onChange={(v) => patchLocal("base_kms", v)} />
            <NumberField label="Base hours" value={local.base_hours} onChange={(v) => patchLocal("base_hours", v)} />
            <NumberField label="Extra km ₹" value={local.extra_km} onChange={(v) => patchLocal("extra_km", v)} />
            <NumberField label="Extra hour ₹" value={local.extra_hour} onChange={(v) => patchLocal("extra_hour", v)} />
            <NumberField label="Night ₹" value={local.night} onChange={(v) => patchLocal("night", v)} />
            <NumberField label="Driver TA ₹ / day" value={local.driver_ta} onChange={(v) => patchLocal("driver_ta", v)} />
          </div>
        </Section>

        <Section
          title="Outstation rates"
          subtitle="Optional. For trips outside the city, billed per km."
        >
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Per km ₹" value={outstation.per_km} onChange={(v) => patchOutstation("per_km", v)} />
            <NumberField label="Driver TA ₹ / day" value={outstation.driver_ta} onChange={(v) => patchOutstation("driver_ta", v)} />
          </div>
        </Section>

        <Section
          title="Packages"
          subtitle="Optional. Fixed-price plans like airport or railway drops. Name them yourself."
        >
          <div className="flex flex-col gap-3">
            {visiblePackages.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No packages yet. Add one for fixed-price trips like an airport drop.
              </p>
            )}
            {visiblePackages.map(({ p, idx }) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3"
              >
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={p.plan_name}
                    onChange={(e) => patchPackage(idx, { plan_name: e.target.value })}
                    placeholder="e.g. IGI Airport drop"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:w-40">
                  <Label className="text-xs">Fixed price ₹ *</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={p.fixed_price}
                    onChange={(e) => patchPackage(idx, { fixed_price: e.target.value })}
                    placeholder="e.g. 2500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePackage(idx)}
                  className="h-9 px-2 inline-flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="Remove package"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPackage}
              className="self-start"
            >
              <Plus className="h-4 w-4" />
              Add package
            </Button>
          </div>
        </Section>
      </div>
    );
  },
);

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function NumberField({
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
