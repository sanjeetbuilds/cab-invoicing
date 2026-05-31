"use client";

/**
 * Inline-radio filter widgets used by the Invoices and Quotations list
 * pages. Replaces the older nested-dropdown pattern (a Select inside a
 * BottomSheet creates a modal-on-modal, bad). Here every option is
 * visible at once, tapped like a row, with the selected state shown
 * via a filled radio circle on the right.
 */

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type PeriodPreset =
  | "all"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function thisMonthLabel(): string {
  const d = new Date();
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
function lastMonthLabel(): string {
  const d = new Date();
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${MONTH_NAMES[prev.getMonth()]} ${prev.getFullYear()}`;
}
function thisYearLabel(): string {
  return String(new Date().getFullYear());
}

function startOfMonthIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function endOfMonthIso(d: Date): string {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(last.getDate()).padStart(2, "0")}`;
}

/** Returns the ISO bounds [from, to] for the selected preset (or null
 *  when the preset is "all"). For "custom" returns the explicit dates
 *  if both are set, else null (no narrowing yet). */
export function resolvePeriodBounds(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
): [string, string] | null {
  if (preset === "all") return null;
  if (preset === "this_month") {
    const now = new Date();
    return [startOfMonthIso(now), endOfMonthIso(now)];
  }
  if (preset === "last_month") {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return [startOfMonthIso(prev), endOfMonthIso(prev)];
  }
  if (preset === "this_year") {
    const y = new Date().getFullYear();
    return [`${y}-01-01`, `${y}-12-31`];
  }
  // custom
  if (customFrom && customTo) return [customFrom, customTo];
  return null;
}

export function periodChipLabel(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
): string | null {
  if (preset === "all") return null;
  if (preset === "this_month") return thisMonthLabel();
  if (preset === "last_month") return lastMonthLabel();
  if (preset === "this_year") return thisYearLabel();
  // custom
  if (!customFrom || !customTo) return null;
  return `${fmtChipDate(customFrom)} – ${fmtChipDate(customTo)}`;
}

function fmtChipDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${MONTH_NAMES[Number(m) - 1]?.slice(0, 3) ?? ""}`;
}

interface RadioRowProps {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

function RadioRow({ selected, onSelect, children }: RadioRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left text-sm transition-colors duration-100",
        selected ? "bg-accent-soft" : "hover:bg-muted/40 active:bg-muted",
      )}
    >
      <span className="truncate text-foreground">{children}</span>
      <span
        className={cn(
          "h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
          selected ? "border-primary bg-primary" : "border-muted-foreground/40",
        )}
        aria-hidden
      >
        {selected && (
          <span className="block h-full w-full rounded-full ring-2 ring-card ring-inset" />
        )}
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
      {children}
    </p>
  );
}

export function ClientFilterList({
  clientId,
  setClientId,
  clients,
}: {
  clientId: string;
  setClientId: (v: string) => void;
  clients: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const showSearch = clients.length >= 8;
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(needle));
  }, [search, clients]);

  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Client</SectionLabel>
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="pl-8 h-9"
          />
        </div>
      )}
      <div className="flex flex-col">
        <RadioRow
          selected={clientId === "all"}
          onSelect={() => setClientId("all")}
        >
          All clients
        </RadioRow>
        {filtered.map((c) => (
          <RadioRow
            key={c.id}
            selected={clientId === c.id}
            onSelect={() => setClientId(c.id)}
          >
            {c.name}
          </RadioRow>
        ))}
        {showSearch && filtered.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            No clients match &quot;{search}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}

export function PeriodFilterList({
  preset,
  setPreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
}: {
  preset: PeriodPreset;
  setPreset: (v: PeriodPreset) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
}) {
  const presets: { value: PeriodPreset; label: string }[] = [
    { value: "all", label: "All time" },
    { value: "this_month", label: `This month · ${thisMonthLabel()}` },
    { value: "last_month", label: `Last month · ${lastMonthLabel()}` },
    { value: "this_year", label: `This year · ${thisYearLabel()}` },
    { value: "custom", label: "Custom range…" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Period</SectionLabel>
      <div className="flex flex-col">
        {presets.map((p) => (
          <div key={p.value}>
            <RadioRow
              selected={preset === p.value}
              onSelect={() => setPreset(p.value)}
            >
              {p.label}
            </RadioRow>
            {p.value === "custom" && preset === "custom" && (
              <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  From
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-9"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  To
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-9"
                  />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface FilterChip {
  key: string;
  label: string;
  onClear: () => void;
}

export function FilterChipBar({
  chips,
  onClearAll,
}: {
  chips: FilterChip[];
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-accent-foreground border border-accent-soft px-3 py-1 text-xs font-medium hover:opacity-90"
        >
          <span className="truncate max-w-[180px]">{chip.label}</span>
          <X className="h-3 w-3" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
