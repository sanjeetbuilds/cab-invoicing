"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptics";
import {
  commitImportAction,
  previewImportAction,
} from "./actions";
import type {
  ImportEntity,
  ParsedWorkbook,
  PreviewRow,
} from "@/lib/bulk-import/types";

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  // chunked to avoid hitting String.fromCharCode arg-count caps on
  // large files
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

type Stage = "idle" | "preview" | "importing";

export function BulkImportClient({
  initialScope = "all",
}: {
  initialScope?: ImportEntity;
}) {
  const scope = initialScope;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [stage, setStage] = useState<Stage>("idle");
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<ParsedWorkbook | null>(null);
  const [report, setReport] = useState<{
    clients: number;
    vehicles: number;
    rateCards: number;
    rateCardsUpdated: number;
    skipped: number;
  } | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPending(true);
    try {
      const b64 = await fileToBase64(file);
      setFileBase64(b64);
      const result = await previewImportAction({ fileBase64: b64, scope });
      if (!result.ok) {
        toast.error(result.error);
        setPreview(null);
        setStage("idle");
        return;
      }
      setPreview(result.preview);
      setStage("preview");
    } finally {
      setPending(false);
    }
  }

  async function commit() {
    if (!fileBase64) return;
    setStage("importing");
    setPending(true);
    const result = await commitImportAction({ fileBase64, scope });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      setStage("preview");
      return;
    }
    hapticSuccess();
    const skipped =
      (preview?.clients.filter((r) => r.errors.length > 0).length ?? 0) +
      (preview?.vehicles.filter((r) => r.errors.length > 0).length ?? 0) +
      (preview?.rateCards.filter((r) => r.errors.length > 0).length ?? 0);
    setReport({
      clients: result.clients,
      vehicles: result.vehicles,
      rateCards: result.rateCards,
      rateCardsUpdated: result.rateCardsUpdated,
      skipped,
    });
    const parts: string[] = [];
    if (scope === "all" || scope === "clients") {
      parts.push(`${result.clients} clients`);
    }
    if (scope === "all" || scope === "vehicles") {
      parts.push(`${result.vehicles} vehicles`);
    }
    if (scope === "all" || scope === "rate_cards") {
      parts.push(`${result.rateCards} rate cards`);
    }
    toast.success(`Imported ${parts.join(", ")}.`);
    router.refresh();
  }

  function reset() {
    setStage("idle");
    setPreview(null);
    setFileBase64("");
    setFileName("");
    setReport(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const totals = preview
    ? {
        will:
          preview.clients.filter((r) => r.errors.length === 0).length +
          preview.vehicles.filter((r) => r.errors.length === 0).length +
          preview.rateCards.filter((r) => r.errors.length === 0).length,
        attn:
          preview.clients.filter((r) => r.errors.length > 0).length +
          preview.vehicles.filter((r) => r.errors.length > 0).length +
          preview.rateCards.filter((r) => r.errors.length > 0).length,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              1. Download the template
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              One Excel workbook with three sheets — Clients, Vehicles, Rate
              Cards. Fill in your data, save, and upload below.
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

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              2. Upload your filled template
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              We&apos;ll preview what will be imported before anything saves.
              Auto-fixes (state casing, vehicle-number spacing) happen
              silently and get flagged on each row.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileChange}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              variant="outline"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {fileName ? "Choose a different file" : "Choose file"}
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground truncate">
                {fileName}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {preview && totals && (
        <Card elevated>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">3. Preview</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {totals.will}
                </span>{" "}
                ready to import ·{" "}
                <span
                  className={cn(
                    "font-semibold",
                    totals.attn > 0 ? "text-warning-foreground" : "text-foreground",
                  )}
                >
                  {totals.attn}
                </span>{" "}
                need attention
              </p>
            </div>

            {preview.topErrors.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
                {preview.topErrors.join(" · ")}
              </div>
            )}

            <PreviewSection
              title="Clients"
              rows={preview.clients}
              renderRow={(r) => (
                <>
                  <span className="font-medium">{r.data.name}</span>
                  {r.data.gstin && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.data.gstin}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {r.data.state}
                  </span>
                </>
              )}
            />
            <PreviewSection
              title="Vehicles"
              rows={preview.vehicles}
              renderRow={(r) => (
                <>
                  <span className="font-mono font-medium">{r.data.number}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.data.type} · {r.data.ownership}
                  </span>
                </>
              )}
            />
            <PreviewSection
              title="Rate cards"
              rows={preview.rateCards}
              renderRow={(r) => (
                <>
                  <span className="font-medium">{r.data.client_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.data.car_type} · {r.data.mode}
                    {r.data.plan_name ? ` · ${r.data.plan_name}` : ""}
                  </span>
                </>
              )}
            />

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={reset}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={commit}
                disabled={pending || totals.will === 0}
              >
                {stage === "importing" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Import {totals.will} {totals.will === 1 ? "item" : "items"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {report && (
        <Card elevated>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="font-medium">Import complete</p>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {(scope === "all" || scope === "clients") && (
                <li>
                  <span className="font-medium text-foreground">
                    {report.clients}
                  </span>{" "}
                  clients added
                </li>
              )}
              {(scope === "all" || scope === "vehicles") && (
                <li>
                  <span className="font-medium text-foreground">
                    {report.vehicles}
                  </span>{" "}
                  vehicles added
                </li>
              )}
              {(scope === "all" || scope === "rate_cards") && (
                <li>
                  <span className="font-medium text-foreground">
                    {report.rateCards}
                  </span>{" "}
                  rate cards added
                  {report.rateCardsUpdated > 0 && (
                    <>
                      {" "}
                      ·{" "}
                      <span className="font-medium text-foreground">
                        {report.rateCardsUpdated}
                      </span>{" "}
                      updated
                    </>
                  )}
                </li>
              )}
              {report.skipped > 0 && (
                <li>
                  <span className="font-medium text-foreground">
                    {report.skipped}
                  </span>{" "}
                  rows skipped — see issues above.
                </li>
              )}
            </ul>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={reset}>
                Import more
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PreviewSection<T>({
  title,
  rows,
  renderRow,
}: {
  title: string;
  rows: PreviewRow<T>[];
  renderRow: (row: PreviewRow<T>) => React.ReactNode;
}) {
  if (rows.length === 0) return null;
  const ok = rows.filter((r) => r.errors.length === 0);
  const bad = rows.filter((r) => r.errors.length > 0);

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {title}
        <span className="ml-2 normal-case font-normal">
          {ok.length} will import · {bad.length} need attention
        </span>
      </p>

      {ok.length > 0 && (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border">
            {ok.map((r) => (
              <li
                key={r.sheetRow}
                className="px-3 py-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
              >
                <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">
                  row {r.sheetRow}
                </span>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0 flex-1">
                  {renderRow(r)}
                </div>
                {r.fixes.length > 0 && (
                  <Badge variant="warning" className="text-[10px]">
                    auto-fixed
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {bad.length > 0 && (
        <div className="rounded-md border border-warning/30 bg-warning-soft/40 overflow-hidden">
          <ul className="divide-y divide-warning/30">
            {bad.map((r) => (
              <li
                key={r.sheetRow}
                className="px-3 py-3 flex flex-col gap-1 text-sm"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xs text-muted-foreground font-mono w-12 shrink-0">
                    row {r.sheetRow}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0 flex-1">
                    {renderRow(r)}
                  </div>
                </div>
                <ul className="ml-12 mt-1 space-y-1 text-xs text-warning-foreground">
                  {r.errors.map((e, i) => (
                    <li key={i} className="flex gap-2">
                      <AlertTriangle className="h-3 w-3 mt-1 shrink-0" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
