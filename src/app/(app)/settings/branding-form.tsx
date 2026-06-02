"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SaveBar, SaveBarSpacer } from "@/components/shell/save-bar";
import { cn } from "@/lib/utils";
import type { BrandMode, Company } from "@/lib/supabase/types";
import {
  removeLogoAction,
  updateBrandModeAction,
  uploadLogoAction,
} from "./branding-actions";

const MODE_OPTIONS: { value: BrandMode; label: string; hint: string }[] = [
  {
    value: "text_only",
    label: "Text only",
    hint: "Company name as styled text.",
  },
  {
    value: "logo_only",
    label: "Logo only",
    hint: "Just the uploaded logo, no text.",
  },
  {
    value: "logo_with_text",
    label: "Logo and text",
    hint: "Logo next to the company name. Recommended.",
  },
];

/** Browse-friendly resize: max 800px on the longest side. PNG preserves
 *  transparency, we always normalise to PNG when we resize but keep the
 *  original blob if it is already small enough. JPG of a photo stays
 *  JPG. */
async function processLogoFile(
  file: File,
): Promise<{ blob: Blob; ext: "png" | "jpg"; aspectRatio: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read that image."));
      el.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error("Image dimensions unknown.");
    const aspectRatio = w / h;

    const max = Math.max(w, h);
    if (max <= 800) {
      const ext = file.type === "image/png" ? "png" : "jpg";
      return { blob: file, ext, aspectRatio };
    }

    const scale = 800 / max;
    const tw = Math.round(w * scale);
    const th = Math.round(h * scale);
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available.");
    ctx.drawImage(img, 0, 0, tw, th);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas encode failed."))),
        "image/png",
      );
    });
    return { blob, ext: "png", aspectRatio };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function readImageAspectRatio(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read that image."));
      el.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) {
      throw new Error("Image dimensions unknown.");
    }
    return img.naturalWidth / img.naturalHeight;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BrandingForm({ company }: { company: Company }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Staged state: every choice (mode, file, remove) is held locally
  // and only committed on Save. The single SaveBar at the bottom of
  // the tab is the one and only "saved" signal for branding.
  const [pendingMode, setPendingMode] = useState<BrandMode>(company.brand_mode);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingAspectRatio, setPendingAspectRatio] = useState<number | null>(null);
  const [pendingRemove, setPendingRemove] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Object URLs for the staged file get revoked on cleanup so we do
  // not leak blob URLs when the user picks another file.
  useEffect(() => {
    if (!pendingFile) {
      setPreviewBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  // Show the pending preview if there is one, otherwise the saved
  // logo, unless the user has staged a removal.
  const displayLogoUrl = previewBlobUrl ?? (pendingRemove ? null : company.logo_url);
  const displayAspectRatio = pendingFile
    ? pendingAspectRatio
    : pendingRemove
      ? null
      : company.logo_aspect_ratio;

  const needsLogo =
    pendingMode === "logo_only" || pendingMode === "logo_with_text";

  const isDirty =
    pendingMode !== company.brand_mode ||
    pendingFile !== null ||
    pendingRemove;

  function handleModeSelect(next: BrandMode) {
    setPendingMode(next);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      toast.error("Logo must be a PNG or JPG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB.");
      return;
    }
    let ar: number;
    try {
      ar = await readImageAspectRatio(file);
    } catch (err) {
      toast.error((err as Error).message);
      return;
    }
    setPendingFile(file);
    setPendingAspectRatio(ar);
    setPendingRemove(false);
    // Auto-promote to logo_with_text on first upload so the user
    // never picks a logo then wonders why nothing shows.
    if (pendingMode === "text_only") {
      setPendingMode("logo_with_text");
    }
  }

  function handleRemoveSelect() {
    setPendingFile(null);
    setPendingAspectRatio(null);
    setPendingRemove(true);
    // Without a logo, the only consistent mode is text_only.
    setPendingMode("text_only");
  }

  async function onSave() {
    if (!isDirty) return;
    setPending(true);
    try {
      if (pendingFile) {
        const { blob, ext, aspectRatio: ar } = await processLogoFile(pendingFile);
        const base64 = await blobToBase64(blob);
        const result = await uploadLogoAction({
          fileBase64: base64,
          ext,
          aspectRatio: ar,
          mode: pendingMode,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Branding saved.");
      } else if (pendingRemove) {
        const result = await removeLogoAction();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Logo removed.");
      } else if (pendingMode !== company.brand_mode) {
        const result = await updateBrandModeAction({ mode: pendingMode });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Branding saved.");
      }
      setPendingFile(null);
      setPendingAspectRatio(null);
      setPendingRemove(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const previewName = company.name || "Your company";

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Branding
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              How your identity appears in the app and on invoice PDFs. Your
              company name comes from the Company tab.
            </p>
          </div>

          {/* Style choice */}
          <div className="grid gap-3 sm:grid-cols-3">
            {MODE_OPTIONS.map((opt) => {
              const active = pendingMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleModeSelect(opt.value)}
                  aria-pressed={active}
                  className={cn(
                    "text-left rounded-lg border p-3 transition-colors duration-150",
                    active
                      ? "border-foreground/40 bg-accent-soft"
                      : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <div className="h-14 mb-3 flex items-center justify-center rounded border border-border bg-card overflow-hidden">
                    <ModePreview
                      mode={opt.value}
                      name={previewName}
                      logoUrl={displayLogoUrl}
                      aspectRatio={displayAspectRatio}
                    />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {opt.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {opt.hint}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Contextual upload area, only when a logo style is picked. */}
          {needsLogo && (
            <div className="flex flex-col gap-3 border-t border-border pt-6">
              <Label>Company logo</Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-20 w-[200px] shrink-0 rounded-md border border-dashed border-border bg-card flex items-center justify-center overflow-hidden">
                  {displayLogoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={displayLogoUrl}
                      alt="Company logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">No logo yet</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex gap-2 flex-wrap">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      disabled={pending}
                    >
                      <Upload className="h-4 w-4" />
                      {displayLogoUrl ? "Replace logo" : "Upload logo"}
                    </Button>
                    {displayLogoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveSelect}
                        disabled={pending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove logo
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG or JPG, up to 2 MB. Best results: transparent PNG,
                    200 to 400 px wide. Saved when you click Save branding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Live invoice header preview. Connects the company name
              (saved from the Company tab) with the branding style
              (chosen here) so the user sees one result. */}
          <div className="flex flex-col gap-3 border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              This is how you appear on invoices and in the app.
            </p>
            <InvoiceHeaderPreview
              name={previewName}
              mode={pendingMode}
              logoUrl={displayLogoUrl}
              aspectRatio={displayAspectRatio}
            />
          </div>
        </CardContent>
      </Card>

      <SaveBarSpacer />
      <SaveBar
        onSave={onSave}
        dirty={isDirty}
        pending={pending}
        hideCancel
        saveLabel="Save branding"
      />
    </>
  );
}

/** Tiny inline preview rendered inside each mode card. */
function ModePreview({
  mode,
  name,
  logoUrl,
  aspectRatio,
}: {
  mode: BrandMode;
  name: string;
  logoUrl: string | null;
  aspectRatio: number | null;
}) {
  const HEIGHT = 28;
  const logoWidth = aspectRatio
    ? Math.min(HEIGHT * aspectRatio, 80)
    : HEIGHT;

  if (mode === "text_only") {
    return (
      <span className="font-semibold text-foreground text-sm truncate px-3">
        {name}
      </span>
    );
  }

  if (mode === "logo_only") {
    return logoUrl ? (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={logoUrl}
        alt={name}
        style={{ height: HEIGHT, width: logoWidth }}
        className="object-contain"
      />
    ) : (
      <span className="text-[10px] text-muted-foreground italic">
        Upload a logo to preview
      </span>
    );
  }

  // logo_with_text
  return (
    <span className="inline-flex items-center gap-2 px-2 min-w-0">
      {logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logoUrl}
          alt={name}
          style={{
            height: HEIGHT - 4,
            width: aspectRatio
              ? Math.min((HEIGHT - 4) * aspectRatio, 64)
              : HEIGHT - 4,
          }}
          className="object-contain shrink-0"
        />
      ) : (
        <span className="inline-block h-5 w-5 rounded bg-muted shrink-0" />
      )}
      <span className="font-semibold text-foreground text-sm truncate">
        {name}
      </span>
    </span>
  );
}

/** Larger framed preview that mimics the top of an invoice header.
 *  The greyed bars on the left stand in for the address block, the
 *  right side shows the live brand. */
function InvoiceHeaderPreview({
  name,
  mode,
  logoUrl,
  aspectRatio,
}: {
  name: string;
  mode: BrandMode;
  logoUrl: string | null;
  aspectRatio: number | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        {/* Address column placeholder, just decorative bars. */}
        <div className="flex flex-col gap-1.5 min-w-0 max-w-[55%]">
          <div className="h-2 w-12 rounded bg-muted-foreground/30" />
          <div className="h-2 w-24 rounded bg-muted-foreground/20" />
          <div className="h-2 w-20 rounded bg-muted-foreground/20" />
        </div>
        {/* Brand block on the right, mirroring the real invoice header. */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
          {mode === "text_only" && (
            <span className="text-base font-semibold text-foreground">
              {name}
            </span>
          )}
          {mode === "logo_only" &&
            (logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt={name}
                style={{
                  height: 40,
                  width: aspectRatio
                    ? Math.min(40 * aspectRatio, 160)
                    : 40,
                }}
                className="object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Upload a logo to preview
              </span>
            ))}
          {mode === "logo_with_text" && (
            <span className="inline-flex items-center gap-2">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
                  alt={name}
                  style={{
                    height: 28,
                    width: aspectRatio
                      ? Math.min(28 * aspectRatio, 90)
                      : 28,
                  }}
                  className="object-contain"
                />
              ) : (
                <span className="inline-block h-7 w-7 rounded bg-muted" />
              )}
              <span className="text-base font-semibold text-foreground">
                {name}
              </span>
            </span>
          )}
          <span className="text-[9px] tracking-wider uppercase text-muted-foreground mt-1">
            Tax Invoice
          </span>
        </div>
      </div>
    </div>
  );
}
