"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import {
  shouldShowFilter,
  shouldShowPeriodFilter,
  shouldShowSearch,
  shouldShowSort,
  visibleStatusPills,
} from "@/lib/list-controls";
import type { Client, Invoice } from "@/lib/supabase/types";

type StatusFilter = "all" | "unpaid" | "paid" | "reversed";
type SortKey = "newest" | "oldest" | "amount_desc" | "amount_asc";
type PeriodFilter = "all" | "this_month" | "last_month" | "this_year";

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "reversed", label: "Reversed" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Highest amount" },
  { value: "amount_asc", label: "Lowest amount" },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

function startOfMonthIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function endOfMonthIso(d: Date): string {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}
function periodBounds(period: PeriodFilter): [string, string] | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "this_month")
    return [startOfMonthIso(now), endOfMonthIso(now)];
  if (period === "last_month") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return [startOfMonthIso(prev), endOfMonthIso(prev)];
  }
  return [`${now.getFullYear()}-01-01`, `${now.getFullYear()}-12-31`];
}

export function InvoicesList({
  invoices,
  clients,
  prefix,
  dutiesByInvoice,
}: {
  invoices: Invoice[];
  clients: Pick<Client, "id" | "name">[];
  prefix: string;
  dutiesByInvoice: Record<string, number>;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [clientId, setClientId] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Progressive disclosure — flags derived from the unfiltered dataset.
  const showSearch = shouldShowSearch(invoices.length);
  const showSort = shouldShowSort(invoices.length);
  const statusPills = useMemo(
    () => visibleStatusPills(invoices, STATUS_PILLS, (i) => i.status),
    [invoices],
  );
  const showClientFilter = useMemo(
    () => shouldShowFilter(invoices, (i) => i.client_id),
    [invoices],
  );
  const showPeriodFilter = useMemo(
    () => shouldShowPeriodFilter(invoices, (i) => i.invoice_date),
    [invoices],
  );
  const showFiltersButton = showClientFilter || showPeriodFilter;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const bounds = periodBounds(period);
    const list = invoices.filter((inv) => {
      if (status !== "all" && inv.status !== status) return false;
      if (clientId !== "all" && inv.client_id !== clientId) return false;
      if (bounds) {
        if (inv.invoice_date < bounds[0] || inv.invoice_date > bounds[1]) {
          return false;
        }
      }
      if (needle) {
        const fullNumber = `${prefix}${inv.invoice_number}`.toLowerCase();
        const name = (inv.client_name ?? "").toLowerCase();
        if (
          !fullNumber.includes(needle) &&
          !String(inv.invoice_number).includes(needle) &&
          !name.includes(needle)
        ) {
          return false;
        }
      }
      return true;
    });

    switch (sort) {
      case "newest":
        list.sort(
          (a, b) =>
            b.invoice_date.localeCompare(a.invoice_date) ||
            b.invoice_number - a.invoice_number,
        );
        break;
      case "oldest":
        list.sort(
          (a, b) =>
            a.invoice_date.localeCompare(b.invoice_date) ||
            a.invoice_number - b.invoice_number,
        );
        break;
      case "amount_desc":
        list.sort((a, b) => b.net_amount - a.net_amount);
        break;
      case "amount_asc":
        list.sort((a, b) => a.net_amount - b.net_amount);
        break;
    }
    return list;
  }, [invoices, status, clientId, period, search, sort, prefix]);

  const activeFilterCount =
    (status !== "all" ? 1 : 0) +
    (clientId !== "all" ? 1 : 0) +
    (period !== "all" ? 1 : 0);

  function clearAll() {
    setSearch("");
    setStatus("all");
    setClientId("all");
    setPeriod("all");
    setSort("newest");
    setShowFilters(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {(showSearch || showFiltersButton || statusPills.length > 0 || showSort) && (
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-b border-border flex flex-col gap-3">
          {(showSearch || showFiltersButton) && (
            <div className="flex items-center gap-2">
              {showSearch && (
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invoice number or client…"
                    className="pl-9"
                  />
                </div>
              )}
              {showFiltersButton && (
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 h-10 text-sm font-medium shrink-0",
                    !showSearch && "ml-auto",
                    showFilters || activeFilterCount > 0
                      ? "bg-accent-soft text-accent-foreground border-accent-soft"
                      : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  )}
                  aria-expanded={showFilters}
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          {(statusPills.length > 0 || showSort) && (
            <div className="flex items-center gap-2 flex-wrap">
              {statusPills.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {statusPills.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setStatus(p.value)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
                        status === p.value
                          ? "bg-accent-soft text-accent-foreground border-accent-soft"
                          : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              {showSort && (
                <div className="ml-auto flex items-center gap-2">
                  <Label htmlFor="sort" className="text-xs text-muted-foreground">
                    Sort
                  </Label>
                  <Select
                    value={sort}
                    onValueChange={(v) =>
                      typeof v === "string" && setSort(v as SortKey)
                    }
                  >
                    <SelectTrigger id="sort" className="h-9 min-w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {showFilters && showFiltersButton && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {showClientFilter && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="f-client" className="text-xs">
                    Client
                  </Label>
                  <Select
                    value={clientId}
                    onValueChange={(v) =>
                      typeof v === "string" && setClientId(v)
                    }
                  >
                    <SelectTrigger id="f-client">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All clients</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {showPeriodFilter && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="f-period" className="text-xs">
                    Period
                  </Label>
                  <Select
                    value={period}
                    onValueChange={(v) =>
                      typeof v === "string" && setPeriod(v as PeriodFilter)
                    }
                  >
                    <SelectTrigger id="f-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(activeFilterCount > 0 || search) && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="sm:col-span-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground self-start"
                >
                  <X className="h-3 w-3" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
            <p>No invoices match these filters.</p>
            <button
              type="button"
              onClick={clearAll}
              className="text-primary hover:text-primary-hover font-medium"
            >
              Clear filters
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop: structured table, whole row navigates to detail */}
          <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Duties</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const duties = dutiesByInvoice[inv.id] ?? 0;
                  return (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={(e) => {
                        // Let the anchor handle modifier-key navigation itself
                        if (
                          e.target instanceof HTMLAnchorElement ||
                          (e.target as HTMLElement).closest("a")
                        )
                          return;
                        window.location.href = `/invoices/${inv.id}`;
                      }}
                    >
                      <TableCell className="font-mono font-medium">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {prefix}
                          {inv.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell>{inv.client_name ?? "—"}</TableCell>
                      <TableCell className="font-mono">
                        {fmtDate(inv.invoice_date)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.period_from && inv.period_to
                          ? `${fmtDate(inv.period_from)} – ${fmtDate(inv.period_to)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {duties || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatINR(inv.net_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={inv.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: client name is the headline, number/period are muted,
              amount sits prominent on the right. */}
          <div className="md:hidden flex flex-col gap-2">
            {filtered.map((inv) => {
              const duties = dutiesByInvoice[inv.id] ?? 0;
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`}>
                  <Card className="active:bg-muted transition-colors">
                    <CardContent className="py-2.5 px-3 flex items-start gap-3">
                      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-foreground truncate">
                            {inv.client_name ?? "—"}
                          </p>
                          <StatusBadge status={inv.status} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          <span className="font-mono">
                            {prefix}
                            {inv.invoice_number}
                          </span>
                          {inv.period_from && inv.period_to ? (
                            <>
                              {" · "}
                              {fmtDate(inv.period_from)}–{fmtDate(inv.period_to)}
                            </>
                          ) : (
                            <>{" · "}{fmtDate(inv.invoice_date)}</>
                          )}
                          {duties > 0 ? ` · Duties: ${duties}` : null}
                        </p>
                      </div>
                      <p className="font-mono text-base font-semibold tabular-nums shrink-0 self-center">
                        {formatINR(inv.net_amount)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  switch (status) {
    case "paid":
      return <Badge variant="success">Paid</Badge>;
    case "unpaid":
      return <Badge variant="warning">Unpaid</Badge>;
    case "reversed":
      return <Badge variant="ghost">Reversed</Badge>;
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
  }
}
