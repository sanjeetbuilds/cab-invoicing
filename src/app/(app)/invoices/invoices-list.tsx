"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Filter,
  MoreVertical,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import type { Client, Invoice } from "@/lib/supabase/types";
import { markInvoicePaidAction, reverseInvoiceAction } from "./actions";

type StatusFilter = "all" | "unpaid" | "paid" | "reversed";
type SortKey =
  | "newest"
  | "oldest"
  | "amount_desc"
  | "amount_asc";
type PeriodFilter =
  | "all"
  | "this_month"
  | "last_month"
  | "this_year";

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
  // this_year
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
      {/* Sticky toolbar: search + status pills + filter button */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-b border-border flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number or client…"
              className="pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 h-10 text-sm font-medium shrink-0",
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
        </div>

        {/* Status pills + sort — always visible */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_PILLS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setStatus(p.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
                  status === p.value
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
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
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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

      {/* Results */}
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
        <div className="flex flex-col gap-2.5">
          {filtered.map((inv) => (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              prefix={prefix}
              duties={dutiesByInvoice[inv.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InvoiceRow({
  invoice,
  prefix,
  duties,
}: {
  invoice: Invoice;
  prefix: string;
  duties: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmPaid, setConfirmPaid] = useState<null | "mark" | "unmark">(
    null,
  );
  const [confirmReverse, setConfirmReverse] = useState(false);

  const fullNumber = `${prefix}${invoice.invoice_number}`;
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;
  const reversed = invoice.status === "reversed";
  const paid = invoice.status === "paid";

  async function togglePaid(target: boolean) {
    setPending(true);
    const result = await markInvoicePaidAction({
      id: invoice.id,
      paid: target,
    });
    setPending(false);
    if (result.ok) {
      toast.success(target ? "Marked paid." : "Marked unpaid.");
      setConfirmPaid(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onReverse() {
    setPending(true);
    const result = await reverseInvoiceAction({ id: invoice.id });
    setPending(false);
    if (result.ok) {
      toast.success(`${fullNumber} reversed.`);
      setConfirmReverse(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function copyNumber() {
    navigator.clipboard
      .writeText(fullNumber)
      .then(() => toast.success(`Copied ${fullNumber}`))
      .catch(() => toast.error("Copy failed."));
  }

  return (
    <>
      <Card>
        <CardContent className="py-3 px-3 sm:px-4 flex items-center gap-2">
          {/* Tappable left side — opens PDF */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 flex flex-col gap-0.5 -m-1 p-1 rounded-md hover:bg-muted/40 active:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold tracking-tight">
                {fullNumber}
              </span>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {invoice.client_name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {fmtDate(invoice.invoice_date)}
              {invoice.period_from && invoice.period_to ? (
                <>
                  {" · "}
                  {fmtDate(invoice.period_from)}–{fmtDate(invoice.period_to)}
                </>
              ) : null}
              {duties > 0 ? ` · Duties: ${duties}` : null}
            </p>
            <p className="font-mono text-base font-semibold tabular-nums mt-0.5">
              {formatINR(invoice.net_amount)}
            </p>
          </a>

          {/* Inline actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              title="Open PDF"
              aria-label="Open PDF"
              className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <FileText className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() =>
                reversed
                  ? toast.error("Reversed invoices can't be paid.")
                  : setConfirmPaid(paid ? "unmark" : "mark")
              }
              disabled={pending || reversed}
              title={paid ? "Mark unpaid" : "Mark paid"}
              aria-label={paid ? "Mark unpaid" : "Mark paid"}
              className={cn(
                "inline-flex items-center justify-center h-9 w-9 rounded-md disabled:opacity-40",
                paid
                  ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {paid ? (
                <CheckCircle2 className="h-5 w-5 fill-emerald-100 dark:fill-emerald-950/40" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="More actions"
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem onClick={copyNumber}>
                  <Copy className="h-4 w-4" />
                  Copy invoice number
                </DropdownMenuItem>
                {!reversed && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmReverse(true)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reverse invoice
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmPaid !== null}
        onOpenChange={(o) => !o && setConfirmPaid(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmPaid === "mark" ? "Mark as paid?" : "Mark as unpaid?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Invoice <strong>{fullNumber}</strong> for{" "}
              <strong>{invoice.client_name}</strong> ·{" "}
              {formatINR(invoice.net_amount)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => togglePaid(confirmPaid === "mark")}
              disabled={pending}
            >
              {pending ? "Saving…" : confirmPaid === "mark" ? "Mark paid" : "Mark unpaid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReverse} onOpenChange={setConfirmReverse}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Invoice <strong>{fullNumber}</strong> will be marked reversed and
              its trips will return to the open list so you can re-invoice
              them. The invoice number stays reserved and is never reused.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onReverse} disabled={pending}>
              {pending ? "Reversing…" : "Reverse"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
