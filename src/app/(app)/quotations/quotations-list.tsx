"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  FileText,
  Filter,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  shouldShowFilter,
  shouldShowPeriodFilter,
  shouldShowSearch,
  shouldShowSort,
  visibleStatusPills,
} from "@/lib/list-controls";
import type { Client, Quotation } from "@/lib/supabase/types";
import { acceptQuotationAction, deleteQuotationAction } from "./actions";

type StatusFilter =
  | "all"
  | "draft"
  | "sent"
  | "accepted"
  | "expired"
  | "rejected";

type SortKey = "newest" | "oldest";
type PeriodFilter = "all" | "this_month" | "last_month" | "this_year";

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
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
function periodBounds(p: PeriodFilter): [string, string] | null {
  if (p === "all") return null;
  const now = new Date();
  if (p === "this_month") return [startOfMonthIso(now), endOfMonthIso(now)];
  if (p === "last_month") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return [startOfMonthIso(prev), endOfMonthIso(prev)];
  }
  return [`${now.getFullYear()}-01-01`, `${now.getFullYear()}-12-31`];
}

export function QuotationsList({
  quotations,
  clients,
}: {
  quotations: Quotation[];
  clients: Pick<Client, "id" | "name">[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [clientId, setClientId] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients],
  );

  const showSearch = shouldShowSearch(quotations.length);
  const showSort = shouldShowSort(quotations.length);
  const statusPills = useMemo(
    () => visibleStatusPills(quotations, STATUS_PILLS, (q) => q.status),
    [quotations],
  );
  const showClientFilter = useMemo(
    () =>
      shouldShowFilter(quotations, (q) => q.client_id ?? q.client_name ?? null),
    [quotations],
  );
  const showPeriodFilter = useMemo(
    () => shouldShowPeriodFilter(quotations, (q) => q.date),
    [quotations],
  );
  const showFiltersButton = showClientFilter || showPeriodFilter;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const bounds = periodBounds(period);
    const list = quotations.filter((q) => {
      if (status !== "all" && q.status !== status) return false;
      if (clientId !== "all" && q.client_id !== clientId) return false;
      if (bounds && (q.date < bounds[0] || q.date > bounds[1])) return false;
      if (needle) {
        const name =
          (q.client_id ? clientById.get(q.client_id) : q.client_name) ?? "";
        const number = (q.number ?? "").toLowerCase();
        if (
          !number.includes(needle) &&
          !name.toLowerCase().includes(needle)
        ) {
          return false;
        }
      }
      return true;
    });
    list.sort((a, b) =>
      sort === "newest"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date),
    );
    return list;
  }, [quotations, status, clientId, period, search, sort, clientById]);

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
                    placeholder="Search number or client…"
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
                  <Label htmlFor="qsort" className="text-xs text-muted-foreground">
                    Sort
                  </Label>
                  <Select
                    value={sort}
                    onValueChange={(v) =>
                      typeof v === "string" && setSort(v as SortKey)
                    }
                  >
                    <SelectTrigger id="qsort" className="h-9 min-w-[150px]">
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
                  <Label htmlFor="qf-client" className="text-xs">Client</Label>
                  <Select
                    value={clientId}
                    onValueChange={(v) =>
                      typeof v === "string" && setClientId(v)
                    }
                  >
                    <SelectTrigger id="qf-client">
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
                  <Label htmlFor="qf-period" className="text-xs">Period</Label>
                  <Select
                    value={period}
                    onValueChange={(v) =>
                      typeof v === "string" && setPeriod(v as PeriodFilter)
                    }
                  >
                    <SelectTrigger id="qf-period">
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
            <p>No quotations match these filters.</p>
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
          {/* Desktop (md+): table; row click opens PDF in new tab */}
          <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <DesktopQuotationRow
                    key={q.id}
                    quotation={q}
                    clientName={
                      (q.client_id ? clientById.get(q.client_id) : q.client_name) ??
                      null
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile (<md): rich summary cards */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((q) => (
              <MobileQuotationCard
                key={q.id}
                quotation={q}
                clientName={
                  (q.client_id ? clientById.get(q.client_id) : q.client_name) ??
                  null
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DesktopQuotationRow({
  quotation,
  clientName,
}: {
  quotation: Quotation;
  clientName: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pdfUrl = `/api/quotations/${quotation.id}/pdf`;
  const editUrl = `/quotations/${quotation.id}/edit`;
  const accepted = quotation.status === "accepted";

  function openPdf() {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }

  async function onAccept() {
    setPending(true);
    const result = await acceptQuotationAction(quotation.id);
    setPending(false);
    if (result.ok) {
      toast.success(`${quotation.number} accepted — rate cards upserted.`);
      setConfirmAccept(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onDelete() {
    setPending(true);
    const result = await deleteQuotationAction(quotation.id);
    setPending(false);
    if (result.ok) {
      toast.success(`${quotation.number} deleted.`);
      setConfirmDelete(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function copyNumber() {
    navigator.clipboard
      .writeText(quotation.number)
      .then(() => toast.success(`Copied ${quotation.number}`))
      .catch(() => toast.error("Copy failed."));
  }

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/40"
        onClick={openPdf}
      >
        <TableCell className="font-mono font-medium">{quotation.number}</TableCell>
        <TableCell>{clientName ?? "—"}</TableCell>
        <TableCell className="font-mono">{fmtDate(quotation.date)}</TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {fmtDate(quotation.valid_until)}
        </TableCell>
        <TableCell className="text-center">
          <StatusBadge status={quotation.status} />
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="More actions"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              {!accepted && (
                <DropdownMenuItem
                  onClick={() => setConfirmAccept(true)}
                  disabled={pending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Accept &amp; create rate cards
                </DropdownMenuItem>
              )}
              <DropdownMenuItem render={<Link href={editUrl} />}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyNumber}>
                <Copy className="h-4 w-4" />
                Copy number
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <AcceptDialog
        open={confirmAccept}
        number={quotation.number}
        pending={pending}
        onCancel={() => setConfirmAccept(false)}
        onConfirm={onAccept}
      />
      <DeleteDialog
        open={confirmDelete}
        number={quotation.number}
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
    </>
  );
}

function MobileQuotationCard({
  quotation,
  clientName,
}: {
  quotation: Quotation;
  clientName: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pdfUrl = `/api/quotations/${quotation.id}/pdf`;
  const editUrl = `/quotations/${quotation.id}/edit`;
  const accepted = quotation.status === "accepted";

  function openPdf() {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }

  async function onAccept() {
    setPending(true);
    const result = await acceptQuotationAction(quotation.id);
    setPending(false);
    if (result.ok) {
      toast.success(`${quotation.number} accepted — rate cards upserted.`);
      setConfirmAccept(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onDelete() {
    setPending(true);
    const result = await deleteQuotationAction(quotation.id);
    setPending(false);
    if (result.ok) {
      toast.success(`${quotation.number} deleted.`);
      setConfirmDelete(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function copyNumber() {
    navigator.clipboard
      .writeText(quotation.number)
      .then(() => toast.success(`Copied ${quotation.number}`))
      .catch(() => toast.error("Copy failed."));
  }

  return (
    <>
      <Card>
        <CardContent className="py-3 px-3 flex flex-col gap-3">
          <button
            type="button"
            onClick={openPdf}
            className="text-left flex flex-col gap-2.5 -m-1 p-1 rounded-md hover:bg-muted/40 active:bg-muted transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={quotation.status} />
              <span className="font-mono text-xs text-muted-foreground">
                Quotation #{quotation.number}
              </span>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                For
              </p>
              <p className="font-semibold text-foreground leading-tight">
                {clientName ?? "—"}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Dated {fmtDate(quotation.date)}
              {quotation.valid_until
                ? ` · Valid till ${fmtDate(quotation.valid_until)}`
                : null}
            </p>
          </button>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={openPdf}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover"
            >
              <FileText className="h-4 w-4" />
              Open PDF
            </button>
            {!accepted && (
              <button
                type="button"
                onClick={() => setConfirmAccept(true)}
                disabled={pending}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md border border-border bg-card text-foreground font-medium text-sm hover:bg-muted"
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="More actions"
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-border bg-card text-foreground hover:bg-muted"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <DropdownMenuItem render={<Link href={editUrl} />}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyNumber}>
                  <Copy className="h-4 w-4" />
                  Copy number
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <AcceptDialog
        open={confirmAccept}
        number={quotation.number}
        pending={pending}
        onCancel={() => setConfirmAccept(false)}
        onConfirm={onAccept}
      />
      <DeleteDialog
        open={confirmDelete}
        number={quotation.number}
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
    </>
  );
}

function AcceptDialog({
  open,
  number,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  number: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Accept this quotation?</AlertDialogTitle>
          <AlertDialogDescription>
            The rate lines on quotation <strong>{number}</strong> will be
            upserted into rate cards for this client. Existing rate cards for
            the same (car, mode) are overwritten.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? "Accepting…" : "Accept"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteDialog({
  open,
  number,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  number: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this quotation?</AlertDialogTitle>
          <AlertDialogDescription>
            Quotation <strong>{number}</strong> will be removed. Rate cards
            created from accepting it stay in place.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatusBadge({ status }: { status: Quotation["status"] }) {
  switch (status) {
    case "accepted":
      return <Badge variant="success">Accepted</Badge>;
    case "sent":
      return <Badge variant="accent">Sent</Badge>;
    case "draft":
      return <Badge variant="default">Draft</Badge>;
    case "expired":
      return <Badge variant="ghost">Expired</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
  }
}
