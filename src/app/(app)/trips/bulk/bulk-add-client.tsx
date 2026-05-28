"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  BillingMethod,
  CarType,
  Client,
  RateCard,
  TripMode,
  Vehicle,
} from "@/lib/supabase/types";
import { tripToLines, tripTotal } from "@/lib/trip-lines";
import {
  commitBulkRowsAction,
  discardBulkDraftAction,
  emptyDraftRow,
  saveBulkDraftAction,
  type BulkDraftRow,
} from "./actions";

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];
const decimalRegex = /^\d*\.?\d*$/;

const fmtINR = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toNum = (s: string) => {
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
};

function rowIsReady(r: BulkDraftRow): boolean {
  return (
    !!r.date &&
    !!r.client_id &&
    !!r.vehicle_id &&
    !!r.car_type &&
    !!r.mode &&
    toNum(r.total_kms) > 0
  );
}

interface RowCompute {
  amount: number | null;
  hasRate: boolean;
}

export function BulkAddClient({
  initialRows,
  clients,
  vehicles,
  rateCards,
  disabled,
}: {
  initialRows: BulkDraftRow[];
  clients: Pick<Client, "id" | "name">[];
  vehicles: Pick<Vehicle, "id" | "number" | "type" | "active">[];
  rateCards: RateCard[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<BulkDraftRow[]>(initialRows);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Debounced autosave whenever rows change after the first render.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (disabled) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const result = await saveBulkDraftAction(rows);
      setSaving(false);
      if (result.ok) setSavedAt(Date.now());
      else toast.error(`Autosave failed: ${result.error}`);
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [rows, disabled]);

  const rateByKey = useMemo(() => {
    const m = new Map<string, RateCard>();
    for (const r of rateCards) m.set(`${r.client_id}|${r.car_type}|${r.mode}`, r);
    return m;
  }, [rateCards]);

  const vehiclesById = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles],
  );

  const computeRow = useCallback(
    (r: BulkDraftRow): RowCompute => {
      if (!r.client_id || !r.car_type || !r.mode || !r.total_kms) {
        return { amount: null, hasRate: false };
      }
      const effectiveMethod: BillingMethod =
        r.mode === "local" ? "slab" : r.billing_method;
      const lookupMode: TripMode =
        effectiveMethod === "slab" ? "local" : "outstation";
      const rate = rateByKey.get(`${r.client_id}|${r.car_type}|${lookupMode}`);
      if (!rate) return { amount: null, hasRate: false };
      const lines = tripToLines(
        {
          car_type: r.car_type,
          mode: r.mode,
          billing_method: effectiveMethod,
          total_kms: toNum(r.total_kms),
          total_hours: toNum(r.total_hours),
          night: r.night,
          driver_ta: Math.floor(toNum(r.driver_ta)),
        },
        rate,
      );
      return { amount: tripTotal(lines), hasRate: true };
    },
    [rateByKey],
  );

  const rowComputes = useMemo(
    () => rows.map((r) => computeRow(r)),
    [rows, computeRow],
  );

  const runningTotal = rowComputes.reduce(
    (s, c) => s + (c.amount ?? 0),
    0,
  );
  const readyCount = rows.filter(rowIsReady).length;

  function patchRow(i: number, patch: Partial<BulkDraftRow>) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyDraftRow()]);
  }

  function duplicateRow(i: number) {
    setRows((prev) => {
      const next = [...prev];
      next.splice(i + 1, 0, { ...prev[i] });
      return next;
    });
  }

  function removeRow(i: number) {
    setRows((prev) => {
      if (prev.length === 1) return [emptyDraftRow()];
      return prev.filter((_, idx) => idx !== i);
    });
  }

  async function onCommit() {
    if (readyCount === 0) {
      toast.error("No complete rows to save.");
      return;
    }
    setCommitting(true);
    const result = await commitBulkRowsAction(rows);
    setCommitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Saved ${result.saved} trip${result.saved === 1 ? "" : "s"}.${
        result.remaining.length > 0
          ? ` ${result.remaining.length} incomplete row(s) kept in draft.`
          : ""
      }`,
    );
    setRows(
      result.remaining.length > 0 ? result.remaining : [emptyDraftRow()],
    );
    router.refresh();
  }

  async function onDiscard() {
    setSaving(true);
    const result = await discardBulkDraftAction();
    setSaving(false);
    if (result.ok) {
      setRows([emptyDraftRow()]);
      setSavedAt(null);
      setConfirmDiscard(false);
      toast.success("Draft cleared.");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-xs text-muted-foreground">
          {saving ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving draft…
            </span>
          ) : savedAt ? (
            <span>Draft saved.</span>
          ) : (
            <span>Draft autosaves as you type.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            <span className="font-medium">{readyCount}</span> of{" "}
            <span className="font-medium">{rows.length}</span> ready ·{" "}
            <span className="font-mono">₹{fmtINR(runningTotal)}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDiscard(true)}
            disabled={committing || disabled}
          >
            Discard draft
          </Button>
          <Button
            size="sm"
            onClick={onCommit}
            disabled={committing || disabled || readyCount === 0}
          >
            {committing && <Loader2 className="h-4 w-4 animate-spin" />}
            Save {readyCount} ready trip{readyCount === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium [&>th]:border-b">
              <th className="w-[110px]">Date</th>
              <th className="w-[110px]">End</th>
              <th className="min-w-[160px]">Client</th>
              <th className="min-w-[140px]">Vehicle</th>
              <th className="w-[110px]">Car</th>
              <th className="w-[110px]">Mode</th>
              <th className="w-[60px] text-center">Slab</th>
              <th className="w-[70px] text-right">Kms</th>
              <th className="w-[70px] text-right">Hrs</th>
              <th className="w-[60px] text-right">TA</th>
              <th className="w-[60px] text-center">Night</th>
              <th className="w-[90px] text-right">Charges ₹</th>
              <th className="w-[60px] text-center" title="Toll / Tax / Parking">
                T·T·P
              </th>
              <th className="min-w-[140px]">Notes</th>
              <th className="w-[90px] text-right">Total</th>
              <th className="w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = rowComputes[i];
              const ready = rowIsReady(r);
              return (
                <tr
                  key={i}
                  className={`[&>td]:px-1 [&>td]:py-1 [&>td]:border-b border-muted/50 ${
                    ready ? "" : "bg-amber-50/30 dark:bg-amber-950/10"
                  }`}
                >
                  <td>
                    <Input
                      type="date"
                      value={r.date}
                      onChange={(e) => patchRow(i, { date: e.target.value })}
                      className="h-7 px-1 text-xs"
                    />
                  </td>
                  <td>
                    <Input
                      type="date"
                      value={r.end_date}
                      onChange={(e) => patchRow(i, { end_date: e.target.value })}
                      className="h-7 px-1 text-xs"
                    />
                  </td>
                  <td>
                    <select
                      value={r.client_id}
                      onChange={(e) => patchRow(i, { client_id: e.target.value })}
                      className="h-7 w-full rounded border px-1 text-xs bg-background"
                    >
                      <option value="">—</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={r.vehicle_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const v = vehiclesById.get(id);
                        patchRow(i, {
                          vehicle_id: id,
                          car_type: v ? v.type : r.car_type,
                        });
                      }}
                      className="h-7 w-full rounded border px-1 text-xs bg-background"
                    >
                      <option value="">—</option>
                      {vehicles.map((v) => (
                        <option
                          key={v.id}
                          value={v.id}
                          className={v.active ? "" : "text-muted-foreground"}
                        >
                          {v.number} · {v.type}
                          {v.active ? "" : " (inactive)"}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={r.car_type}
                      onChange={(e) =>
                        patchRow(i, { car_type: e.target.value as CarType | "" })
                      }
                      className="h-7 w-full rounded border px-1 text-xs bg-background"
                    >
                      <option value="">—</option>
                      {CAR_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={r.mode}
                      onChange={(e) => {
                        const m = e.target.value as TripMode | "";
                        patchRow(i, {
                          mode: m,
                          billing_method:
                            m === "outstation" ? "per_km" : "slab",
                        });
                      }}
                      className="h-7 w-full rounded border px-1 text-xs bg-background"
                    >
                      <option value="">—</option>
                      <option value="local">Local</option>
                      <option value="outstation">Outstation</option>
                    </select>
                  </td>
                  <td className="text-center">
                    {r.mode === "outstation" ? (
                      <input
                        type="checkbox"
                        checked={r.billing_method === "slab"}
                        onChange={(e) =>
                          patchRow(i, {
                            billing_method: e.target.checked ? "slab" : "per_km",
                          })
                        }
                        className="h-4 w-4 accent-foreground"
                        title="Bill as slab (use local rate card)"
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={r.total_kms}
                      onChange={(e) =>
                        patchRow(i, { total_kms: e.target.value })
                      }
                      className="h-7 px-1 text-xs text-right"
                    />
                  </td>
                  <td>
                    {r.mode === "local" ? (
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={r.total_hours}
                        onChange={(e) =>
                          patchRow(i, { total_hours: e.target.value })
                        }
                        className="h-7 px-1 text-xs text-right"
                      />
                    ) : (
                      <span className="block text-right text-muted-foreground">—</span>
                    )}
                  </td>
                  <td>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={r.driver_ta}
                      onChange={(e) =>
                        patchRow(i, { driver_ta: e.target.value })
                      }
                      className="h-7 px-1 text-xs text-right"
                    />
                  </td>
                  <td className="text-center">
                    {r.mode === "local" ? (
                      <input
                        type="checkbox"
                        checked={r.night}
                        onChange={(e) =>
                          patchRow(i, { night: e.target.checked })
                        }
                        className="h-4 w-4 accent-foreground"
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={r.extra_charge_amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || decimalRegex.test(v)) {
                          patchRow(i, { extra_charge_amount: v });
                        }
                      }}
                      className="h-7 px-1 text-xs text-right"
                    />
                  </td>
                  <td>
                    <div className="flex justify-center gap-0.5">
                      <ChargeFlag
                        checked={r.charge_toll}
                        onChange={(v) => patchRow(i, { charge_toll: v })}
                        label="T"
                        title="Toll"
                      />
                      <ChargeFlag
                        checked={r.charge_tax}
                        onChange={(v) => patchRow(i, { charge_tax: v })}
                        label="X"
                        title="Tax"
                      />
                      <ChargeFlag
                        checked={r.charge_parking}
                        onChange={(v) => patchRow(i, { charge_parking: v })}
                        label="P"
                        title="Parking"
                      />
                    </div>
                  </td>
                  <td>
                    <Input
                      type="text"
                      value={r.notes}
                      onChange={(e) => patchRow(i, { notes: e.target.value })}
                      className="h-7 px-1 text-xs"
                    />
                  </td>
                  <td className="text-right font-mono">
                    {c.amount == null ? (
                      ready ? (
                        <span className="text-destructive text-[10px]">no rate</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      fmtINR(c.amount)
                    )}
                  </td>
                  <td>
                    <div className="flex gap-0.5">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => duplicateRow(i)}
                        aria-label="Duplicate row"
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => removeRow(i)}
                        aria-label="Delete row"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={14} className="px-2 py-2 text-right text-xs font-medium">
                Running total
              </td>
              <td className="px-2 py-2 text-right font-mono text-sm font-semibold">
                {fmtINR(runningTotal)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-3 flex justify-between">
        <Button variant="outline" size="sm" onClick={addRow} disabled={disabled}>
          <Plus className="h-4 w-4" />
          Add row
        </Button>
        <p className="text-xs text-muted-foreground self-center">
          Rows highlighted in amber are missing required fields — they&apos;ll
          stay in the draft when you save.
        </p>
      </div>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard the entire draft?</AlertDialogTitle>
            <AlertDialogDescription>
              All {rows.length} rows will be cleared. This cannot be undone.
              Trips already saved earlier are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ChargeFlag({
  checked,
  onChange,
  label,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  title: string;
}) {
  return (
    <label
      title={title}
      className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[10px] font-medium ${
        checked
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}
