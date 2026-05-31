"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { vehicleSearchKey } from "@/lib/vehicle-format";
import type { Vehicle } from "@/lib/supabase/types";

export interface VehiclePickerItem
  extends Pick<Vehicle, "id" | "number" | "type" | "active"> {}

export interface VehiclePickerProps {
  vehicles: VehiclePickerItem[];
  value: string | "";
  onValueChange: (id: string) => void;
  /**
   * Called when the user clicks "+ Add vehicle…". Receives whatever
   * the user has typed into the search box so the inline form can
   * pre-fill the number field (e.g. typing "1234" then clicking the
   * add option opens the form with number = "1234").
   */
  onAddNew?: (typedNumber: string) => void;
  /** Optional id for accessibility. */
  id?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Searchable, keyboard-navigable dropdown that ALWAYS shows the human
 * label ("HR 26 ED 9083 (Dzire)") in the trigger, never the raw UUID.
 *
 * Search matches any substring of the spaced or unspaced number, the
 * car type, and the combined display. Typing "9083" finds
 * "HR 26 ED 9083"; typing "Sonet" finds every Sonet.
 */
export function VehiclePicker({
  vehicles,
  value,
  onValueChange,
  onAddNew,
  id,
  placeholder = "Pick a vehicle",
  className,
}: VehiclePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [highlight, setHighlight] = useState(0);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Focus the search input when opened.
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 10);
      setHighlight(0);
    } else {
      setQuery("");
    }
  }, [open]);

  const selected = useMemo(
    () => vehicles.find((v) => v.id === value),
    [vehicles, value],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return vehicles;
    const needle = vehicleSearchKey(query);
    return vehicles.filter((v) => {
      const hay = vehicleSearchKey(v.number) + v.type.toUpperCase();
      return hay.includes(needle);
    });
  }, [vehicles, query]);

  function selectAt(i: number) {
    const v = filtered[i];
    if (!v) return;
    onValueChange(v.id);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length === 0 && onAddNew) {
        onAddNew(query);
        setOpen(false);
      } else {
        selectAt(highlight);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground",
          "transition-colors duration-150 outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
          "hover:bg-muted/40",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={cn(
            "truncate text-left",
            !selected && "text-muted-foreground",
          )}
        >
          {selected
            ? `${selected.number} (${selected.type})${selected.active ? "" : ", inactive"}`
            : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-card-hover"
          role="listbox"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKey}
              placeholder="Search by last 4 digits, full number, or type…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                No matching vehicles.
              </p>
            ) : (
              filtered.map((v, i) => {
                const isSelected = v.id === value;
                const isHighlighted = i === highlight;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => selectAt(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                      isHighlighted ? "bg-accent-soft/60" : "",
                      !v.active && "text-muted-foreground",
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="font-mono">
                      {v.number}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {v.type}
                        {v.active ? "" : " (inactive)"}
                      </span>
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-accent-foreground" />
                    )}
                  </button>
                );
              })
            )}
          </div>
          {onAddNew && (
            <button
              type="button"
              onClick={() => {
                onAddNew(query);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-t border-border bg-muted/30 px-3 py-2 text-sm font-medium text-primary hover:bg-muted/50"
            >
              <Plus className="h-4 w-4" />
              {query.trim()
                ? `Add vehicle: ${query.trim()}`
                : "Add new vehicle"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
