"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
    label: "Logo + text",
    hint: "Small logo next to the company name. Recommended.",
  },
];

/** Browse-friendly resize: max 800px on the longest side. PNG preserves
 *  transparency; we always normalize to PNG when we resize, but keep the
 *  original blob if it's already small enough — JPG-of-a-photo stays JPG. */
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

export function BrandingForm({ company }: { company: Company }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<BrandMode>(company.brand_mode);
  const [logoUrl, setLogoUrl] = useState<string | null>(company.logo_url);
  const [aspectRatio, setAspectRatio] = useState<number | null>(
    company.logo_aspect_ratio,
  );
  const [pending, setPending] = useState<"mode" | "upload" | "remove" | null>(
    null,
  );

  async function handleModeChange(next: BrandMode) {
    if (next === mode) return;
    setMode(next);
    setPending("mode");
    const result = await updateBrandModeAction({ mode: next });
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      setMode(company.brand_mode);
      return;
    }
    router.refresh();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      toast.error("Logo must be a PNG or JPG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB.");
      return;
    }
    setPending("upload");
    try {
      const { blob, ext, aspectRatio: ar } = await processLogoFile(file);
      const base64 = await blobToBase64(blob);
      // Auto-promote text_only → logo_with_text on first upload so the
      // user sees their logo immediately — they'll never upload a logo
      // and then expect it to stay hidden.
      const nextMode: BrandMode | undefined =
        mode === "text_only" ? "logo_with_text" : undefined;
      const result = await uploadLogoAction({
        fileBase64: base64,
        ext,
        aspectRatio: ar,
        mode: nextMode,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLogoUrl(result.logoUrl);
      setAspectRatio(result.aspectRatio);
      if (nextMode) setMode(nextMode);
      toast.success("Logo uploaded.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    setPending("remove");
    const result = await removeLogoAction();
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setLogoUrl(null);
    setAspectRatio(null);
    setMode("text_only");
    toast.success("Logo removed.");
    router.refresh();
  }

  const uploadDisabled = mode === "text_only";
  const previewName = company.name || "Your company";

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Branding</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Pick how your identity appears in the app and on PDFs.
          </p>
        </div>

        {/* Mode toggle — three cards, each with a live preview. */}
        <div className="grid gap-3 sm:grid-cols-3">
          {MODE_OPTIONS.map((opt) => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleModeChange(opt.value)}
                disabled={pending !== null}
                aria-pressed={active}
                className={cn(
                  "text-left rounded-lg border p-3 transition-colors duration-150",
                  active
                    ? "border-foreground/40 bg-accent-soft"
                    : "border-border bg-card hover:bg-muted/40",
                  pending !== null && "opacity-60",
                )}
              >
                <div className="h-14 mb-3 flex items-center justify-center rounded border border-border bg-card overflow-hidden">
                  <ModePreview
                    mode={opt.value}
                    name={previewName}
                    logoUrl={logoUrl}
                    aspectRatio={aspectRatio}
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

        {/* Upload area */}
        <div className="flex flex-col gap-3">
          <Label>Company logo</Label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className={cn(
                "h-20 w-[200px] shrink-0 rounded-md border border-dashed border-border bg-card flex items-center justify-center overflow-hidden",
                uploadDisabled && "opacity-50",
              )}
            >
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
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
                  onChange={handleFile}
                  className="hidden"
                  disabled={uploadDisabled || pending !== null}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadDisabled || pending !== null}
                >
                  {pending === "upload" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {logoUrl ? "Replace logo" : "Upload logo"}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    disabled={pending !== null}
                  >
                    {pending === "remove" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove logo
                  </Button>
                )}
              </div>
              {uploadDisabled ? (
                <p className="text-xs text-muted-foreground">
                  Pick &quot;Logo only&quot; or &quot;Logo + text&quot; above to
                  enable logo upload.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Best results: a PNG with transparent background, 200–400 px
                  wide, square or horizontal. We&apos;ll scale it to fit
                  anywhere it&apos;s shown.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                PNG or JPG · up to 2 MB. Your company name is still used for
                invoice filenames and search.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
          style={{ height: HEIGHT - 4, width: aspectRatio ? Math.min((HEIGHT - 4) * aspectRatio, 64) : HEIGHT - 4 }}
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

