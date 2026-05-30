"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/supabase/types";

export interface ClientPickerItem extends Pick<Client, "id" | "name"> {}

export interface ClientPickerProps {
  clients: ClientPickerItem[];
  value: string | "";
  onValueChange: (id: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Same UX as VehiclePicker — always shows the client name in the
 * trigger, never the UUID. Free-text substring search.
 */
export function ClientPicker({
  clients,
  value,
  onValueChange,
  id,
  placeholder = "Pick a client",
  className,
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 10);
      setHighlight(0);
    } else {
      setQuery("");
    }
  }, [open]);

  const selected = useMemo(
    () => clients.find((c) => c.id === value),
    [clients, value],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const needle = query.trim().toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(needle));
  }, [clients, query]);

  function selectAt(i: number) {
    const c = filtered[i];
    if (!c) return;
    onValueChange(c.id);
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
      selectAt(highlight);
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
          {selected ? selected.name : placeholder}
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
              placeholder="Search clients…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                No matching clients.
              </p>
            ) : (
              filtered.map((c, i) => {
                const isSelected = c.id === value;
                const isHighlighted = i === highlight;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => selectAt(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                      isHighlighted ? "bg-accent-soft/60" : "",
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span>{c.name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-accent-foreground" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
