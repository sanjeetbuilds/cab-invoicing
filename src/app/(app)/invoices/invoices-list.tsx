"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Copy,
  FileText,
  Filter,
  MoreVertical,
  RotateCcw,
  Search,
  Share2,
  Undo2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { formatINR } from "@/lib/format";
import { invoiceFilename } from "@/lib/filename";
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
import type { Client, Invoice } from "@/lib/supabase/types";
import { markInvoicePaidAction, reverseInvoiceAction } from "./actions";

type StatusFilter = "all" | "unpaid" | "paid" | "reversed";

const STATUS_PILLS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "reversed", label: "Reversed" },
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
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
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
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

  // Server already returns rows by invoice_number DESC — atomic and
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
      {(showSearch || showFiltersButton || statusPills.length > 0) && (
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

          {/* Desktop (md+): inline panel below the toolbar, mirrors the
              mobile bottom-sheet content. */}
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
      )}

      {/* Mobile bottom sheet — inline radio sections, no nested
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
        <>
          {/* Desktop (md+): clean table; row click opens PDF */}
          <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Duties</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <DesktopInvoiceRow
                    key={inv.id}
                    invoice={inv}
                    prefix={prefix}
                    duties={dutiesByInvoice[inv.id] ?? 0}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile (<md): rich summary cards — replace the detail page */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((inv) => (
              <MobileInvoiceCard
                key={inv.id}
                invoice={inv}
                prefix={prefix}
                duties={dutiesByInvoice[inv.id] ?? 0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DesktopInvoiceRow({
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
  const downloadName = invoiceFilename(fullNumber, invoice.client_name);
  const reversed = invoice.status === "reversed";
  const paid = invoice.status === "paid";

  function openPdf() {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }

  // WhatsApp / email / Drive share — hands the file blob to the OS
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
      <TableRow
        className="cursor-pointer hover:bg-muted/40"
        onClick={openPdf}
      >
        <TableCell className="font-mono font-medium">{fullNumber}</TableCell>
        <TableCell>{invoice.client_name ?? "—"}</TableCell>
        <TableCell className="font-mono">{fmtDate(invoice.invoice_date)}</TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {invoice.period_from && invoice.period_to
            ? `${fmtDate(invoice.period_from)} – ${fmtDate(invoice.period_to)}`
            : "—"}
        </TableCell>
        <TableCell className="text-right font-mono">{duties || "—"}</TableCell>
        <TableCell className="text-right font-mono">
          {formatINR(invoice.net_amount)}
        </TableCell>
        <TableCell className="text-center">
          <StatusBadge status={invoice.status} />
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
              <DropdownMenuItem onClick={shareInvoicePdf}>
                <Share2 className="h-4 w-4" />
                Share PDF
              </DropdownMenuItem>
              {!reversed && !paid && (
                <DropdownMenuItem onClick={() => setConfirmPaid("mark")}>
                  <Check className="h-4 w-4" />
                  Mark paid
                </DropdownMenuItem>
              )}
              {!reversed && paid && (
                <DropdownMenuItem onClick={() => setConfirmPaid("unmark")}>
                  <Undo2 className="h-4 w-4" />
                  Mark unpaid
                </DropdownMenuItem>
              )}
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
        </TableCell>
      </TableRow>

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
    </>
  );
}

function MobileInvoiceCard({
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
  const downloadName = invoiceFilename(fullNumber, invoice.client_name);
  const reversed = invoice.status === "reversed";
  const paid = invoice.status === "paid";

  function openPdf() {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }

  async function shareInvoicePdf() {
    try {
      const result = await sharePdf({
        url: pdfUrl,
        filename: downloadName,
        title: `Invoice ${fullNumber}`,
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
        <CardContent className="py-3 px-3 flex flex-col gap-3">
          {/* Tappable summary block — anywhere on this area opens the PDF */}
          <button
            type="button"
            onClick={openPdf}
            className="text-left flex flex-col gap-3 -m-1 p-1 rounded-md hover:bg-muted/40 active:bg-muted transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={invoice.status} />
              <span className="font-mono text-xs text-muted-foreground">
                Invoice #{fullNumber}
              </span>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Billed to
              </p>
              <p className="font-semibold text-foreground leading-tight">
                {invoice.client_name ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Net amount
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums leading-tight">
                {formatINR(invoice.net_amount)}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              {fmtDate(invoice.invoice_date)}
              {invoice.period_from && invoice.period_to ? (
                <>
                  {" · Period "}
                  {fmtDate(invoice.period_from)}–{fmtDate(invoice.period_to)}
                </>
              ) : null}
              {duties > 0 ? ` · Duties: ${duties}` : null}
            </p>
          </button>

          {/* Action row — Share is primary because the most common job is
              sending the invoice to the client. Open PDF stays as a
              secondary outline button for previewing first. */}
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={shareInvoicePdf}
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
            {!reversed && !paid && (
              <button
                type="button"
                onClick={() => setConfirmPaid("mark")}
                disabled={pending}
                aria-label="Mark paid"
                title="Mark paid"
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-border bg-card text-foreground hover:bg-muted"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            {!reversed && paid && (
              <button
                type="button"
                onClick={() => setConfirmPaid("unmark")}
                disabled={pending}
                aria-label="Mark unpaid"
                title="Mark unpaid"
                className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-border bg-card text-foreground hover:bg-muted"
              >
                <Undo2 className="h-4 w-4" />
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
          <AlertDialogTitle>Reverse this invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            Invoice <strong>{fullNumber}</strong> for{" "}
            <strong>{invoice.client_name}</strong> will be marked reversed and
            its trips will return to the open list so you can re-invoice them.
            The invoice number stays reserved and is never reused.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? "Reversing…" : "Reverse"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
