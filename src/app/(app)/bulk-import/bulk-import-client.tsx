"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptics";
import { formatINR } from "@/lib/format";
import {
  commitImportAction,
  previewImportAction,
} from "./actions";
import type {
  ImportClientRow,
  ImportEntity,
  ImportRateCardRow,
  ImportVehicleRow,
  ParsedWorkbook,
  PreviewRow,
} from "@/lib/bulk-import/types";

type Stage =
  | "idle"
  | "selected"
  | "parsing"
  | "parse-error"
  | "preview"
  | "importing"
  | "success"
  | "import-error";

interface FilePayload {
  base64: string;
  name: string;
  size: number;
}

interface ImportReport {
  clients: number;
  vehicles: number;
  rateCards: number;
  rateCardsUpdated: number;
  skipped: number;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BulkImportClient({
  initialScope = "all",
}: {
  initialScope?: ImportEntity;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const scope = initialScope;

  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<FilePayload | null>(null);
  const [error, setError] = useState<string>("");
  const [preview, setPreview] = useState<ParsedWorkbook | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const lower = f.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      toast.error("Please upload an .xlsx or .xls file.");
      return;
    }
    const base64 = await fileToBase64(f);
    setFile({ base64, name: f.name, size: f.size });
    setStage("selected");
    setError("");
  }

  function clearFile() {
    setFile(null);
    setError("");
    setStage("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleParse() {
    if (!file) return;
    setStage("parsing");
    setError("");
    const result = await previewImportAction({
      fileBase64: file.base64,
      scope,
    });
    if (!result.ok) {
      setError(result.error);
      setStage("parse-error");
      return;
    }
    setPreview(result.preview);
    setStage("preview");
  }

  async function handleImport() {
    if (!file) return;
    setStage("importing");
    const result = await commitImportAction({
      fileBase64: file.base64,
      scope,
    });
    if (!result.ok) {
      setError(result.error);
      setStage("import-error");
      return;
    }
    const skipped =
      (preview?.clients.filter((r) => r.errors.length > 0).length ?? 0) +
      (preview?.vehicles.filter((r) => r.errors.length > 0).length ?? 0) +
      (preview?.rateCards.filter((r) => r.errors.length > 0).length ?? 0);
    const r: ImportReport = {
      clients: result.clients,
      vehicles: result.vehicles,
      rateCards: result.rateCards,
      rateCardsUpdated: result.rateCardsUpdated,
      skipped,
    };
    setReport(r);
    setStage("success");
    hapticSuccess();
    const total = r.clients + r.vehicles + r.rateCards + r.rateCardsUpdated;
    toast.success(`Successfully imported ${total} item${total === 1 ? "" : "s"}.`);
    router.refresh();
  }

  function reset() {
    setStage("idle");
    setFile(null);
    setError("");
    setPreview(null);
    setReport(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <TemplateCard />

      {(stage === "idle" ||
        stage === "selected" ||
        stage === "parsing" ||
        stage === "parse-error") && (
        <UploadCard
          stage={stage}
          file={file}
          error={error}
          fileRef={fileRef}
          onPick={() => fileRef.current?.click()}
          onChange={onFileChange}
          onClear={clearFile}
          onParse={handleParse}
        />
      )}

      {stage === "preview" && preview && (
        <PreviewCard
          preview={preview}
          onCancel={reset}
          onImport={handleImport}
        />
      )}

      {stage === "importing" && <ImportingOverlay />}

      {stage === "success" && report && (
        <SuccessCard report={report} onReset={reset} />
      )}

      {stage === "import-error" && (
        <ImportErrorCard error={error} onRetry={handleImport} onReset={reset} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 1, template download
// ─────────────────────────────────────────────────────────────────────

function TemplateCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Step 1. Download the template
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            One Excel workbook with three sheets: Clients, Vehicles, and Rate
            Cards. Fill in your data, save, then upload below.
          </p>
        </div>
        <a
          href="/templates/bulk-import-template.xlsx"
          download
          className="self-start inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Download template (.xlsx)
        </a>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 2, upload (covers idle / selected / parsing / parse-error)
// ─────────────────────────────────────────────────────────────────────

function UploadCard({
  stage,
  file,
  error,
  fileRef,
  onPick,
  onChange,
  onClear,
  onParse,
}: {
  stage: Stage;
  file: FilePayload | null;
  error: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onPick: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onParse: () => void;
}) {
  const isError = stage === "parse-error";
  const isParsing = stage === "parsing";
  const hasFile = stage === "selected" || isParsing || isError;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Step 2. Upload your filled template
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            You will see every row before anything is saved. We fix small
            things like state spelling and vehicle number spacing, and we
            show you each fix.
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={onChange}
          className="hidden"
        />

        {!hasFile && (
          // Idle drop-zone, clickable area that opens the picker.
          <button
            type="button"
            onClick={onPick}
            className={cn(
              "flex flex-col items-center justify-center gap-2 py-10 rounded-lg",
              "border-2 border-dashed border-border bg-muted/30",
              "hover:border-primary/40 hover:bg-muted/50 transition-colors",
            )}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">
              Drop your file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              .xlsx or .xls · up to a few MB
            </p>
          </button>
        )}

        {hasFile && file && (
          // File-selected card, green filename, size, remove ×.
          <div
            className={cn(
              "rounded-lg p-4 flex items-center gap-3",
              isError
                ? "bg-destructive-soft/50 border border-destructive/30"
                : "bg-success-soft/40 border border-success/20",
            )}
          >
            <FileSpreadsheet
              className={cn(
                "h-6 w-6 shrink-0",
                isError ? "text-destructive" : "text-success",
              )}
            />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium truncate",
                  isError ? "text-destructive" : "text-success-foreground",
                )}
              >
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
            {!isParsing && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove file"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {isError && (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">We couldn&apos;t read this file.</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure it&apos;s the latest{" "}
                <a
                  href="/templates/bulk-import-template.xlsx"
                  download
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  template
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {hasFile && (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={isError ? onClear : onParse}
              disabled={isParsing}
            >
              {isParsing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isParsing
                ? "Reading your file…"
                : isError
                  ? "Try again"
                  : "Upload and preview"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 3, preview (summary + tabs)
// ─────────────────────────────────────────────────────────────────────

function PreviewCard({
  preview,
  onCancel,
  onImport,
}: {
  preview: ParsedWorkbook;
  onCancel: () => void;
  onImport: () => void;
}) {
  const okClients = preview.clients.filter((r) => r.errors.length === 0).length;
  const okVehicles = preview.vehicles.filter((r) => r.errors.length === 0).length;
  const okRateCards = preview.rateCards.filter((r) => r.errors.length === 0).length;
  const badRows =
    preview.clients.filter((r) => r.errors.length > 0).length +
    preview.vehicles.filter((r) => r.errors.length > 0).length +
    preview.rateCards.filter((r) => r.errors.length > 0).length;
  const importable = okClients + okVehicles + okRateCards;

  // Pick the first tab that has any rows so we don't open on an empty tab.
  const defaultTab =
    preview.clients.length > 0
      ? "clients"
      : preview.vehicles.length > 0
        ? "vehicles"
        : "rate-cards";

  return (
    <div className="flex flex-col gap-4">
      {/* Success summary, green */}
      <div className="rounded-xl bg-success-soft/40 border border-success/20 p-5 flex items-start gap-3">
        <CheckCircle2 className="h-6 w-6 text-success shrink-0 mt-0.5" />
        <div className="flex-1 flex flex-col gap-3">
          <div>
            <p className="font-semibold text-foreground">
              We read your file successfully. Here&apos;s what we&apos;ll import:
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <SummaryStat label="Clients" value={preview.clients.length} />
            <SummaryStat label="Vehicles" value={preview.vehicles.length} />
            <SummaryStat label="Rate cards" value={preview.rateCards.length} />
            <SummaryStat
              label="Need attention"
              value={badRows}
              tone={badRows > 0 ? "warning" : "muted"}
            />
          </div>
          {preview.topErrors.length > 0 && (
            <div className="text-sm text-destructive">
              {preview.topErrors.join(" · ")}
            </div>
          )}
        </div>
      </div>

      {/* Tabs, Clients / Vehicles / Rate Cards */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="clients">
                Clients ({preview.clients.length})
              </TabsTrigger>
              <TabsTrigger value="vehicles">
                Vehicles ({preview.vehicles.length})
              </TabsTrigger>
              <TabsTrigger value="rate-cards">
                Rate cards ({preview.rateCards.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clients" className="pt-4">
              <ClientTable rows={preview.clients} />
            </TabsContent>
            <TabsContent value="vehicles" className="pt-4">
              <VehicleTable rows={preview.vehicles} />
            </TabsContent>
            <TabsContent value="rate-cards" className="pt-4">
              <RateCardTable rows={preview.rateCards} />
            </TabsContent>
          </Tabs>

          {badRows > 0 && (
            <button
              type="button"
              onClick={() => downloadErrorsCsv(preview)}
              className="self-start inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              <Download className="h-3 w-3" />
              Download error rows as CSV
            </button>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={onImport} disabled={importable === 0}>
              Import {importable} item{importable === 1 ? "" : "s"}
              {badRows > 0 ? ` (skip ${badRows} error${badRows === 1 ? "" : "s"})` : ""}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "muted";
}) {
  return (
    <div>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums leading-none",
          tone === "warning" && value > 0 ? "text-warning-foreground" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
        {label}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Tables for the three tabs
// ─────────────────────────────────────────────────────────────────────

function RowShell({
  row,
  children,
}: {
  row: PreviewRow<unknown>;
  children: React.ReactNode;
}) {
  const hasErrors = row.errors.length > 0;
  const hasFixes = row.fixes.length > 0;
  return (
    <li
      className={cn(
        "px-3 py-3 flex flex-col gap-2 text-sm",
        hasErrors && "border-l-2 border-destructive bg-destructive-soft/30",
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-xs text-muted-foreground font-mono w-12 shrink-0 mt-0.5">
          row {row.sheetRow}
        </span>
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1">
          {children}
        </div>
        <div className="flex flex-wrap gap-1 shrink-0">
          {hasFixes && (
            <Badge
              variant="warning"
              className="text-[10px]"
              title={row.fixes.join(" · ")}
            >
              auto-fixed
            </Badge>
          )}
        </div>
      </div>
      {hasErrors && (
        <ul className="ml-12 text-xs text-destructive space-y-1">
          {row.errors.map((e, i) => (
            <li key={i} className="flex gap-1.5">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{e}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function EmptyTable({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground py-6 text-center">
      No {label} in this upload.
    </p>
  );
}

function ClientTable({ rows }: { rows: PreviewRow<ImportClientRow>[] }) {
  if (rows.length === 0) return <EmptyTable label="clients" />;
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {rows.map((r) => (
        <RowShell key={r.sheetRow} row={r}>
          <span className="font-medium text-foreground truncate">
            {r.data.name}
          </span>
          {r.data.gstin && (
            <span className="font-mono text-xs text-muted-foreground truncate">
              {r.data.gstin}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{r.data.state}</span>
          {r.data.is_rcm && (
            <Badge variant="accent" className="text-[10px]">RCM</Badge>
          )}
          {r.data.default_booked_by && (
            <span className="text-xs text-muted-foreground truncate">
              {r.data.default_booked_by}
            </span>
          )}
        </RowShell>
      ))}
    </ul>
  );
}

function VehicleTable({ rows }: { rows: PreviewRow<ImportVehicleRow>[] }) {
  if (rows.length === 0) return <EmptyTable label="vehicles" />;
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {rows.map((r) => (
        <RowShell key={r.sheetRow} row={r}>
          <span className="font-mono font-medium text-foreground">
            {r.data.number}
          </span>
          <span className="text-xs text-muted-foreground">{r.data.type}</span>
          <Badge
            variant={r.data.ownership === "own" ? "accent" : "default"}
            className="text-[10px]"
          >
            {r.data.ownership === "own" ? "Own" : "Attached"}
          </Badge>
          {r.data.vendor_name && (
            <span className="text-xs text-muted-foreground truncate">
              {r.data.vendor_name}
            </span>
          )}
        </RowShell>
      ))}
    </ul>
  );
}

function RateCardTable({ rows }: { rows: PreviewRow<ImportRateCardRow>[] }) {
  if (rows.length === 0) return <EmptyTable label="rate cards" />;
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {rows.map((r) => {
        const rate = formatRateCardRate(r.data);
        return (
          <RowShell key={r.sheetRow} row={r}>
            <span className="font-medium text-foreground truncate">
              {r.data.client_name}
            </span>
            <span className="text-xs text-muted-foreground">
              {r.data.car_type} · {r.data.mode}
              {r.data.plan_name ? ` · ${r.data.plan_name}` : ""}
            </span>
            {rate && (
              <span className="text-xs font-mono text-foreground/80">
                {rate}
              </span>
            )}
            {r.meta?.willUpdate && (
              <Badge variant="warning" className="text-[10px]">
                will update
              </Badge>
            )}
            {r.meta?.clientIsNew && (
              <Badge variant="accent" className="text-[10px]">
                new client
              </Badge>
            )}
          </RowShell>
        );
      })}
    </ul>
  );
}

function formatRateCardRate(d: ImportRateCardRow): string | null {
  if (d.mode === "local" && d.base_rate != null) {
    return `Base ${formatINR(d.base_rate)}`;
  }
  if (d.mode === "outstation" && d.per_km != null) {
    return `${formatINR(d.per_km)}/km`;
  }
  if ((d.mode === "transfer" || d.mode === "package") && d.fixed_price != null) {
    return `${formatINR(d.fixed_price)} fixed`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// CSV download of error rows
// ─────────────────────────────────────────────────────────────────────

function downloadErrorsCsv(preview: ParsedWorkbook) {
  type AnyRow = PreviewRow<Record<string, unknown>>;
  const sections: { name: string; rows: AnyRow[] }[] = [
    {
      name: "Clients",
      rows: preview.clients.filter((r) => r.errors.length > 0) as unknown as AnyRow[],
    },
    {
      name: "Vehicles",
      rows: preview.vehicles.filter((r) => r.errors.length > 0) as unknown as AnyRow[],
    },
    {
      name: "Rate Cards",
      rows: preview.rateCards.filter((r) => r.errors.length > 0) as unknown as AnyRow[],
    },
  ];
  const lines: string[] = [];
  for (const section of sections) {
    if (section.rows.length === 0) continue;
    lines.push(`# ${section.name}`);
    const keys = Object.keys(section.rows[0].data);
    lines.push(["row", ...keys, "errors"].map(csvEscape).join(","));
    for (const r of section.rows) {
      const values = keys.map((k) => csvEscape(String(r.data[k] ?? "")));
      lines.push(
        [String(r.sheetRow), ...values, csvEscape(r.errors.join(" | "))].join(","),
      );
    }
    lines.push("");
  }
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bulk-import-errors.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ─────────────────────────────────────────────────────────────────────
// Importing overlay
// ─────────────────────────────────────────────────────────────────────

function ImportingOverlay() {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card rounded-xl shadow-card-hover p-8 flex flex-col items-center gap-3 max-w-sm text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-medium text-foreground">Importing your data…</p>
        <p className="text-sm text-muted-foreground">
          Creating clients, adding vehicles, setting up rate cards. This takes
          a moment.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Success state
// ─────────────────────────────────────────────────────────────────────

function SuccessCard({
  report,
  onReset,
}: {
  report: ImportReport;
  onReset: () => void;
}) {
  return (
    <Card elevated>
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="h-14 w-14 rounded-full bg-success-soft flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Done. Your data is added.
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Please check the lists below to confirm.
          </p>
        </div>

        <ul className="text-sm text-foreground space-y-1">
          <li>
            <ImportCount
              n={report.clients}
              singular="new client"
              plural="new clients"
              emptyFallback="0 new clients, all already existed"
            />
          </li>
          <li>
            <ImportCount
              n={report.vehicles}
              singular="new vehicle"
              plural="new vehicles"
              emptyFallback="0 new vehicles, all already existed"
            />
          </li>
          <li>
            <span className="font-bold tabular-nums">{report.rateCards}</span>{" "}
            {report.rateCards === 1 ? "rate" : "rates"} added
            {report.rateCardsUpdated > 0 && (
              <>
                {", "}
                <span className="font-bold tabular-nums">
                  {report.rateCardsUpdated}
                </span>{" "}
                updated
              </>
            )}
          </li>
          {report.skipped > 0 && (
            <li className="text-warning-foreground">
              <span className="font-bold tabular-nums">{report.skipped}</span>{" "}
              row{report.skipped === 1 ? "" : "s"} skipped. See issues above.
            </li>
          )}
        </ul>

        <p className="text-sm text-foreground/80 max-w-md pt-2">
          Next, add a trip, then make your first invoice.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-2 w-full sm:w-auto">
          <Link href="/trips/new" className="flex-1">
            <Button type="button" className="w-full">
              Add a trip
            </Button>
          </Link>
          <Link href="/rate-cards" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              View rate cards
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button type="button" variant="ghost" className="w-full">
              Go to dashboard
            </Button>
          </Link>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Import more
        </button>
      </CardContent>
    </Card>
  );
}

/** "0 new clients, all already existed" reads better than a bare "0
 *  clients added" because a zero count doesn't mean the import failed,
 *  it usually means we matched existing records. */
function ImportCount({
  n,
  singular,
  plural,
  emptyFallback,
}: {
  n: number;
  singular: string;
  plural: string;
  emptyFallback: string;
}) {
  if (n === 0) return <>{emptyFallback}</>;
  return (
    <>
      <span className="font-bold tabular-nums">{n}</span>{" "}
      {n === 1 ? singular : plural} added
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Import error
// ─────────────────────────────────────────────────────────────────────

function ImportErrorCard({
  error,
  onRetry,
  onReset,
}: {
  error: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive-soft flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Something went wrong during import.
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {error}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
          <Button type="button" variant="ghost" onClick={onReset}>
            Start over
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
