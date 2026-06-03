"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Download,
  Eye,
  Filter,
  MoreVertical,
  RotateCcw,
  Search,
  Send,
  Share2,
  Trash2,
  Undo2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { invoiceFilename } from "@/lib/filename";
import { hapticDestructive, hapticSuccess } from "@/lib/haptics";
import { downloadPdf, sharePdf } from "@/lib/share-pdf";
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
import type { Client, Invoice } from "@/lib/supabase/types";
import {
  deleteInvoiceAction,
  issueDraftAction,
  markInvoicePaidAction,
  reverseInvoiceAction,
} from "./actions";

type StatusFilter = "all" | "draft" | "unpaid" | "paid" | "reversed";

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "reversed", label: "Undone" },
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

const MONTHS_LONG = [
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

/** Long readable date for a card or row meta line, like "31 May 2026".
 *  Parsed by hand to avoid any time zone shift on the ISO date. */
function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${MONTHS_LONG[Number(m) - 1] ?? ""} ${y}`;
}

export function InvoicesList({
  invoices,
  clients,
  prefix,
  dutiesByInvoice,
  header,
  actions,
  initialFrom,
  initialTo,
}: {
  invoices: Invoice[];
  clients: Pick<Client, "id" | "name">[];
  prefix: string;
  dutiesByInvoice: Record<string, number>;
  /** Page title, rendered as the first row of the sticky header. */
  header?: React.ReactNode;
  /** Page action buttons (Quick invoice, Build invoice). Rendered in one
   *  even row with the filter button so they share a line. */
  actions?: React.ReactNode;
  /** Optional date range, from the billed by month view. When both are
   *  set the list opens filtered to that custom period. */
  initialFrom?: string;
  initialTo?: string;
}) {
  const hasInitialRange = Boolean(initialFrom && initialTo);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [clientId, setClientId] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodPreset>(
    hasInitialRange ? "custom" : "all",
  );
  const [customFrom, setCustomFrom] = useState<string>(initialFrom ?? "");
  const [customTo, setCustomTo] = useState<string>(initialTo ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();

  const showSearch = shouldShowSearch(invoices.length);
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

  // Server already returns rows by invoice_number DESC, atomic and
  // sequential, so newest invoice is always on top. No client-side sort.
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const bounds = resolvePeriodBounds(period, customFrom, customTo);
    return invoices.filter((inv) => {
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
  }, [invoices, status, clientId, period, customFrom, customTo, search, prefix]);

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
      {/* Sticky header: title, search, filters and status pills stay at
          the top of the page scroll with a solid background above the
          rows. Normal flow, top 0, so the first row stays fully visible. */}
      <div className="sticky top-0 z-30 bg-background pb-3">
        <div className="flex flex-col gap-3 border-b-[0.5px] border-border pb-3">
        {header}

        {/* Top actions in one even row: Quick invoice, Build invoice,
            then the filter as an outline icon button at the end. Wraps
            only if it truly cannot fit. */}
        {(actions || showFiltersButton) && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {showFiltersButton && (
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-label="Filters"
                title="Filters"
                className={cn(
                  "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                  showFilters
                    ? "bg-muted text-foreground border-border"
                    : "bg-card text-foreground border-border hover:bg-muted",
                )}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number or client…"
              className="pl-8"
            />
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
        </div>
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
        // One item per invoice. On phones it renders a compact card with
        // gaps between; on desktop the same data as a row inside a single
        // framed card, rows split by a hairline. The item component holds
        // both layouts so the actions and menu stay identical.
        <div className="flex flex-col gap-3 md:gap-0 md:overflow-hidden md:rounded-lg md:border-[0.5px] md:border-border md:bg-card">
          {filtered.map((inv) => (
            <InvoiceListItem
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

// Action button classes, shared by the card and the desktop row so the
// two match. Share is the one filled CTA, Download is outline, both about
// 38px tall. Flat, no gradient.
const SHARE_BTN =
  "inline-flex h-[38px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary-hover active:scale-[0.97]";
const DOWNLOAD_BTN =
  "inline-flex h-[38px] items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-transform hover:bg-muted active:scale-[0.97]";
const MENU_BTN =
  "inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted";

function InvoiceListItem({
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);

  const fullNumber = `${prefix}${invoice.invoice_number}`;
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;
  const viewUrl = `/invoices/${invoice.id}`;
  const downloadName = invoiceFilename(fullNumber, invoice.client_name);
  const reversed = invoice.status === "reversed";
  const paid = invoice.status === "paid";
  const draft = invoice.status === "draft";
  // Drafts (never issued) and undone invoices can be deleted and their
  // number freed. Active issued and paid invoices cannot.
  const deletable = draft || reversed;

  function openPdf() {
    // Same-tab navigation to the in-shell PDF viewer keeps the user
    // inside the app, critical on installed PWAs where a new tab
    // strands them in the system browser with no way back.
    router.push(viewUrl);
  }

  // WhatsApp / email / Drive share, hands the file blob to the OS
  // share sheet so the recipient sees "Invoice_2037_Bharti_Foundation.pdf"
  // not the Vercel URL. Falls back to a triggered download with the
  // same filename when Web Share Level 2 isn't available.
  async function shareInvoicePdf() {
    try {
      const result = await sharePdf({
        url: pdfUrl,
        filename: downloadName,
        title: `Invoice ${fullNumber}`,
      });
      toast.success(
        result === "shared"
          ? "Share sheet opened."
          : `Downloaded ${downloadName}.`,
      );
    } catch (err) {
      const e = err as Error;
      if (e.name === "AbortError") return; // user closed the share sheet
      toast.error(e.message || "Share failed.");
    }
  }

  async function downloadInvoicePdf() {
    try {
      await downloadPdf({ url: pdfUrl, filename: downloadName });
      toast.success(`Downloaded ${downloadName}.`);
    } catch (err) {
      const e = err as Error;
      toast.error(e.message || "Download failed.");
    }
  }

  async function togglePaid(target: boolean) {
    setPending(true);
    const result = await markInvoicePaidAction({
      id: invoice.id,
      paid: target,
    });
    setPending(false);
    if (result.ok) {
      hapticSuccess();
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
      hapticDestructive();
      toast.success(`${fullNumber} undone.`);
      setConfirmReverse(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onDelete() {
    setPending(true);
    const result = await deleteInvoiceAction({ id: invoice.id });
    setPending(false);
    if (result.ok) {
      hapticDestructive();
      toast.success(
        result.freed_number != null
          ? `${draft ? "Draft" : "Invoice"} ${prefix}${result.freed_number} deleted. Its number is free to use again.`
          : "Deleted.",
      );
      setConfirmDelete(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onIssueDraft() {
    setPending(true);
    const result = await issueDraftAction({ id: invoice.id });
    setPending(false);
    if (result.ok) {
      hapticSuccess();
      toast.success(`Invoice ${fullNumber} issued.`);
      setConfirmIssue(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const meta = `${fmtDateLong(invoice.invoice_date)} · ${duties} trip${
    duties === 1 ? "" : "s"
  }`;

  // The three dot menu holds whatever is not a button. On the mobile
  // card Share and Download are both buttons, so withShare is false. On
  // the desktop row only Download is a button, so Share moves into the
  // menu with withShare true. No copy invoice number.
  const buildMenu = (withShare: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="More invoice actions" className={MENU_BTN}>
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem onClick={openPdf}>
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        {withShare && (
          <DropdownMenuItem onClick={shareInvoicePdf}>
            <Share2 className="h-4 w-4" />
            Share
          </DropdownMenuItem>
        )}
        {draft && (
          <DropdownMenuItem onClick={() => setConfirmIssue(true)}>
            <Send className="h-4 w-4" />
            Issue invoice
          </DropdownMenuItem>
        )}
        {!draft && !reversed && !paid && (
          <DropdownMenuItem onClick={() => setConfirmPaid("mark")}>
            <Check className="h-4 w-4" />
            Mark paid
          </DropdownMenuItem>
        )}
        {!draft && !reversed && paid && (
          <DropdownMenuItem onClick={() => setConfirmPaid("unmark")}>
            <Undo2 className="h-4 w-4" />
            Mark unpaid
          </DropdownMenuItem>
        )}
        {!draft && !reversed && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmReverse(true)}
          >
            <RotateCcw className="h-4 w-4" />
            Undo invoice
          </DropdownMenuItem>
        )}
        {deletable && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            {draft ? "Delete draft" : "Delete invoice"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Share filled, Download outline, then the three dot menu. Raised
  // above the body link so taps on them act instead of opening the
  // invoice. The card stretches Share to the main width.
  const shareLabel = (
    <>
      <Share2 className="h-4 w-4" />
      Share
    </>
  );
  const downloadLabel = (
    <>
      <Download className="h-4 w-4" />
      Download
    </>
  );

  return (
    <>
      {/* Desktop row, md and up, inside the framed list card. The body
          opens the invoice via a stretched link; the actions sit above
          it so they stay tappable. */}
      <div className="relative hidden border-b-[0.5px] border-border last:border-b-0 hover:bg-muted/40 md:block">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="w-16 shrink-0 truncate text-sm font-medium text-foreground">
            #{fullNumber}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">
              {invoice.client_name ?? "-"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{meta}</p>
          </div>
          <span className="w-28 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
            {formatINR(invoice.net_amount)}
          </span>
          <div className="w-24 shrink-0">
            <StatusPill status={invoice.status} />
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={downloadInvoicePdf}
              className={DOWNLOAD_BTN}
            >
              {downloadLabel}
            </button>
            {buildMenu(true)}
          </div>
        </div>
        <Link
          href={viewUrl}
          aria-label={`Open invoice ${fullNumber}`}
          className="absolute inset-0"
        />
      </div>

      {/* Mobile card, below md. */}
      <div className="relative rounded-lg border-[0.5px] border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06)] md:hidden">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 min-w-0 flex-1 text-[15px] font-medium leading-snug text-foreground">
            {invoice.client_name ?? "-"}
          </p>
          <span className="shrink-0 text-sm font-medium text-foreground">
            #{fullNumber}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-2xl font-medium tabular-nums text-foreground">
            {formatINR(invoice.net_amount)}
          </span>
          <StatusPill status={invoice.status} />
        </div>
        <div className="relative z-10 mt-3 flex items-center gap-2 border-t-[0.5px] border-border pt-3">
          <button
            type="button"
            onClick={shareInvoicePdf}
            className={cn(SHARE_BTN, "flex-1")}
          >
            {shareLabel}
          </button>
          <button
            type="button"
            onClick={downloadInvoicePdf}
            className={DOWNLOAD_BTN}
          >
            {downloadLabel}
          </button>
          {buildMenu(false)}
        </div>
        <Link
          href={viewUrl}
          aria-label={`Open invoice ${fullNumber}`}
          className="absolute inset-0 rounded-lg"
        />
      </div>

      <PaidDialog
        open={confirmPaid !== null}
        mode={confirmPaid}
        invoice={invoice}
        fullNumber={fullNumber}
        pending={pending}
        onCancel={() => setConfirmPaid(null)}
        onConfirm={() => togglePaid(confirmPaid === "mark")}
      />
      <ReverseDialog
        open={confirmReverse}
        invoice={invoice}
        fullNumber={fullNumber}
        pending={pending}
        onCancel={() => setConfirmReverse(false)}
        onConfirm={onReverse}
      />
      <DeleteInvoiceDialog
        open={confirmDelete}
        invoice={invoice}
        fullNumber={fullNumber}
        draft={draft}
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
      <IssueDraftDialog
        open={confirmIssue}
        invoice={invoice}
        fullNumber={fullNumber}
        pending={pending}
        onCancel={() => setConfirmIssue(false)}
        onConfirm={onIssueDraft}
      />
    </>
  );
}

function PaidDialog({
  open,
  mode,
  invoice,
  fullNumber,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  mode: "mark" | "unmark" | null;
  invoice: Invoice;
  fullNumber: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "mark" ? "Mark as paid?" : "Mark as unpaid?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Invoice <strong>{fullNumber}</strong> for{" "}
            <strong>{invoice.client_name}</strong> ·{" "}
            {formatINR(invoice.net_amount)}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending
              ? "Saving…"
              : mode === "mark"
                ? "Mark paid"
                : "Mark unpaid"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReverseDialog({
  open,
  invoice,
  fullNumber,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  invoice: Invoice;
  fullNumber: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Undo this invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            Invoice <strong>{fullNumber}</strong> for{" "}
            <strong>{invoice.client_name}</strong> will be marked undone and
            its trips will return to the open list so you can bill them again.
            The number stays with this invoice. To free the number for reuse,
            delete the undone invoice.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? "Undoing…" : "Undo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteInvoiceDialog({
  open,
  invoice,
  fullNumber,
  draft,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  invoice: Invoice;
  fullNumber: string;
  draft: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {draft ? "Delete draft" : "Delete invoice"} {fullNumber}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {draft ? "Draft " : "Invoice "}
            <strong>{fullNumber}</strong> for{" "}
            <strong>{invoice.client_name}</strong> will be removed
            {draft ? " and its trips will return to the open list" : ""}. Its
            number will be free to use again. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function IssueDraftDialog({
  open,
  invoice,
  fullNumber,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  invoice: Invoice;
  fullNumber: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Issue this invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            Draft <strong>{fullNumber}</strong> for{" "}
            <strong>{invoice.client_name}</strong> will be issued. Number{" "}
            <strong>{fullNumber}</strong> then stays with this invoice. If you
            undo and delete it later, the number can be used again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? "Issuing…" : "Issue invoice"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Flat status pill: soft fill, dark text and a small dot, all fixed
// hex so it reads the same in light and dark mode. Undone reuses the
// neutral grey of Draft, the only status the brief did not colour.
const STATUS_PILL: Record<
  Invoice["status"],
  { label: string; bg: string; text: string; dot: string }
> = {
  unpaid: { label: "Unpaid", bg: "#FAECE7", text: "#4A1B0C", dot: "#993C1D" },
  paid: { label: "Paid", bg: "#E1F5EE", text: "#04342C", dot: "#0F6E56" },
  draft: { label: "Draft", bg: "#F1EFE8", text: "#2C2C2A", dot: "#888780" },
  reversed: { label: "Undone", bg: "#F1EFE8", text: "#2C2C2A", dot: "#888780" },
};

function StatusPill({ status }: { status: Invoice["status"] }) {
  const s = STATUS_PILL[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: s.dot }}
        aria-hidden
      />
      {s.label}
    </span>
  );
}
