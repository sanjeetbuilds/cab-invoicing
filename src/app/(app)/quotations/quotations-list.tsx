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
  Share2,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
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
import { quotationFilename } from "@/lib/filename";
import { hapticDestructive, hapticSuccess } from "@/lib/haptics";
import { sharePdf } from "@/lib/share-pdf";
import { useIsMobile } from "@/lib/use-is-mobile";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  ClientFilterList,
  FilterChipBar,
  PeriodFilterList,
  periodChipLabel,
  resolvePeriodBounds,
  type FilterChip,
  type PeriodPreset,
} from "@/components/ui/filter-list";
import {
  shouldShowFilter,
  shouldShowPeriodFilter,
  shouldShowSearch,
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

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

/** Shared column widths between the sticky column header and the
 *  data table below. table-layout: fixed honours these. null = auto. */
const QUOTATION_COL_WIDTHS: (string | null)[] = [
  "110px", // Number
  null,    // Client (auto)
  "85px",  // Date
  "100px", // Valid until
  "110px", // Status
  "55px",  // Actions
];

function QuotationColGroup() {
  return (
    <colgroup>
      {QUOTATION_COL_WIDTHS.map((w, i) => (
        <col key={i} style={w ? { width: w } : undefined} />
      ))}
    </colgroup>
  );
}

export function QuotationsList({
  quotations,
  clients,
  header,
}: {
  quotations: Quotation[];
  clients: Pick<Client, "id" | "name">[];
  /** Page title + actions JSX rendered as the first row of the
   *  single sticky chrome at the top of the list. */
  header?: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [clientId, setClientId] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();

  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients],
  );

  const showSearch = shouldShowSearch(quotations.length);
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

  // Server returns rows by date DESC. Quotation numbers are alphanumeric
  // strings, so date is the natural "newest" key. No client-side sort.
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const bounds = resolvePeriodBounds(period, customFrom, customTo);
    return quotations.filter((q) => {
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
  }, [
    quotations,
    status,
    clientId,
    period,
    customFrom,
    customTo,
    search,
    clientById,
  ]);

  const clientName =
    clientId === "all" ? null : clients.find((c) => c.id === clientId)?.name ?? null;
  const periodChip = periodChipLabel(period, customFrom, customTo);

  const chips: FilterChip[] = [];
  if (clientName) {
    chips.push({
      key: "client",
      label: clientName,
      onClear: () => setClientId("all"),
    });
  }
  if (periodChip) {
    chips.push({
      key: "period",
      label: periodChip,
      onClear: () => {
        setPeriod("all");
        setCustomFrom("");
        setCustomTo("");
      },
    });
  }

  const activeFilterCount = chips.length;

  function clearAll() {
    setSearch("");
    setStatus("all");
    setClientId("all");
    setPeriod("all");
    setCustomFrom("");
    setCustomTo("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 -mt-4 sm:-mt-8 mb-2 px-4 sm:px-6 py-3 bg-background border-b border-border flex flex-col gap-3">
        {header}
        {(showSearch || showFiltersButton) && (
          <div className="flex items-center gap-2">
            {showSearch && (
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search number or client…"
                  className="pl-8"
                />
              </div>
            )}
            {showFiltersButton && (
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 h-10 text-sm font-medium shrink-0",
                  !showSearch && "ml-auto",
                  showFilters || activeFilterCount > 0
                    ? "bg-accent-soft text-accent-foreground border-accent-soft"
                    : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                )}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {statusPills.length > 0 && (
          <div className="flex gap-2 flex-wrap">
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

        {/* Desktop (md+): inline panel below the toolbar, mirrors
            the mobile bottom-sheet content. */}
        {showFilters && showFiltersButton && !isMobile && (
          <div className="hidden md:flex flex-col gap-4 pt-1">
            {showClientFilter && (
              <ClientFilterList
                clientId={clientId}
                setClientId={setClientId}
                clients={clients}
              />
            )}
            {showPeriodFilter && (
              <PeriodFilterList
                preset={period}
                setPreset={setPeriod}
                customFrom={customFrom}
                setCustomFrom={setCustomFrom}
                customTo={customTo}
                setCustomTo={setCustomTo}
              />
            )}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
              >
                Clear all filters
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                Apply filters
              </Button>
            </div>
          </div>
        )}

        {/* Column header row, item 4 in the sticky stack. Desktop
            only; mobile uses cards. Shares column widths with the
            data table below via table-fixed + QuotationColGroup. */}
        {filtered.length > 0 && (
          <div className="hidden md:block -mb-3">
            <table className="w-full table-fixed text-sm">
              <QuotationColGroup />
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
            </table>
          </div>
        )}
      </div>

      {/* Mobile bottom sheet, inline radio sections, no nested
          dropdowns. Apply commits and closes; Clear resets to default. */}
      <BottomSheet
        open={isMobile && showFilters && showFiltersButton}
        onOpenChange={(o) => setShowFilters(o)}
        title="Filters"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="flex-1"
            >
              Clear all
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowFilters(false)}
              className="flex-1"
            >
              Apply filters
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {showClientFilter && (
            <ClientFilterList
              clientId={clientId}
              setClientId={setClientId}
              clients={clients}
            />
          )}
          {showPeriodFilter && (
            <PeriodFilterList
              preset={period}
              setPreset={setPeriod}
              customFrom={customFrom}
              setCustomFrom={setCustomFrom}
              customTo={customTo}
              setCustomTo={setCustomTo}
            />
          )}
        </div>
      </BottomSheet>

      <FilterChipBar chips={chips} onClearAll={clearAll} />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
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
          {/* Desktop (md+): the thead lives in the sticky chrome
              above; we render only the data rows here in a table
              that shares column widths via QuotationColGroup. */}
          <div className="hidden md:block rounded-xl bg-card shadow-card overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <QuotationColGroup />
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
            </table>
          </div>

          {/* Mobile (<md): rich summary cards */}
          <div className="md:hidden flex flex-col gap-4 md:gap-5">
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
  const viewUrl = `/quotations/${quotation.id}`;
  const downloadName = quotationFilename(quotation.number, clientName);
  const editUrl = `/quotations/${quotation.id}/edit`;
  const accepted = quotation.status === "accepted";

  function openPdf() {
    // Same-tab navigation to the in-shell viewer, keeps installed
    // PWA users from getting stranded in the system browser.
    router.push(viewUrl);
  }

  async function shareQuotationPdf() {
    try {
      const result = await sharePdf({
        url: pdfUrl,
        filename: downloadName,
        title: `Quotation ${quotation.number}`,
      });
      if (result === "downloaded") {
        toast.success(`Downloaded ${downloadName}.`);
      }
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError") return;
      toast.error(e.message || "Share failed.");
    }
  }

  async function onAccept() {
    setPending(true);
    const result = await acceptQuotationAction(quotation.id);
    setPending(false);
    if (result.ok) {
      hapticSuccess();
      toast.success(`${quotation.number} accepted, rate cards upserted.`);
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
      hapticDestructive();
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
        <TableCell>{clientName ?? "-"}</TableCell>
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
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuItem onClick={shareQuotationPdf}>
                <Share2 className="h-4 w-4" />
                Share PDF
              </DropdownMenuItem>
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
  const viewUrl = `/quotations/${quotation.id}`;
  const downloadName = quotationFilename(quotation.number, clientName);
  const editUrl = `/quotations/${quotation.id}/edit`;
  const accepted = quotation.status === "accepted";

  function openPdf() {
    // Same-tab navigation, see DesktopQuotationRow above.
    router.push(viewUrl);
  }

  async function shareQuotationPdf() {
    try {
      const result = await sharePdf({
        url: pdfUrl,
        filename: downloadName,
        title: `Quotation ${quotation.number}`,
      });
      if (result === "downloaded") {
        toast.success(`Downloaded ${downloadName}.`);
      }
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError") return;
      toast.error(e.message || "Share failed.");
    }
  }

  async function onAccept() {
    setPending(true);
    const result = await acceptQuotationAction(quotation.id);
    setPending(false);
    if (result.ok) {
      hapticSuccess();
      toast.success(`${quotation.number} accepted, rate cards upserted.`);
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
      hapticDestructive();
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
            className="text-left flex flex-col gap-3 -m-1 p-1 rounded-md hover:bg-muted/40 active:bg-muted transition-colors"
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
                {clientName ?? "-"}
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
              onClick={shareQuotationPdf}
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover"
            >
              <Share2 className="h-4 w-4" />
              Share PDF
            </button>
            <button
              type="button"
              onClick={openPdf}
              aria-label="Open PDF"
              title="Open PDF"
              className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-border bg-card text-foreground hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
            </button>
            {!accepted && (
              <button
                type="button"
                onClick={() => setConfirmAccept(true)}
                disabled={pending}
                aria-label="Accept"
                title="Accept & create rate cards"
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-border bg-card text-foreground hover:bg-muted"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="More actions"
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-border bg-card text-foreground hover:bg-muted"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
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
