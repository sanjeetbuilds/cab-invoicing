"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireWriter } from "@/lib/auth";
import type { BrandMode } from "@/lib/supabase/types";

const BRAND_MODES: BrandMode[] = ["text_only", "logo_only", "logo_with_text"];
const BUCKET = "company-logos";
const INVOICE_CACHE_BUCKET = "invoices";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB, matches the client-side hint
const ALLOWED_EXT = new Set(["png", "jpg", "jpeg"]);

/**
 * Drop every cached invoice PDF for a company. Called when the brand
 * changes so the next download regenerates with the new mode/logo.
 * Best-effort, failures here don't fail the user-facing action, and the
 * `?fresh=1` query param remains an escape hatch.
 */
async function bustInvoicePdfCache(
  admin: SupabaseClient,
  companyId: string,
): Promise<void> {
  const { data: files } = await admin.storage
    .from(INVOICE_CACHE_BUCKET)
    .list(companyId, { limit: 1000 });
  if (!files || files.length === 0) return;
  const paths = files
    .filter((f) => f.name.endsWith(".pdf"))
    .map((f) => `${companyId}/${f.name}`);
  if (paths.length === 0) return;
  await admin.storage.from(INVOICE_CACHE_BUCKET).remove(paths);
}

const BrandModeSchema = z.object({
  mode: z.enum(BRAND_MODES, { message: "Pick a brand mode." }),
});

const UploadSchema = z.object({
  fileBase64: z.string().min(1, "Missing file."),
  ext: z.string().min(1),
  aspectRatio: z.number().positive().finite(),
  /** Optional, if the user picked a mode in the same step, set it too. */
  mode: z.enum(BRAND_MODES).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateBrandModeAction(
  raw: z.infer<typeof BrandModeSchema>,
): Promise<ActionResult> {
  const parsed = BrandModeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false, error: "Only owners and admins can change branding." };
  }

  const { error } = await ctx.admin
    .from("companies")
    .update({ brand_mode: parsed.data.mode })
    .eq("id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  await bustInvoicePdfCache(ctx.admin, ctx.companyId);

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface UploadLogoResult {
  ok: true;
  logoUrl: string;
  aspectRatio: number;
}
export interface UploadLogoError {
  ok: false;
  error: string;
}

export async function uploadLogoAction(
  raw: z.infer<typeof UploadSchema>,
): Promise<UploadLogoResult | UploadLogoError> {
  const parsed = UploadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const ext = parsed.data.ext.toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: "Logo must be a PNG or JPG file." };
  }

  const buf = Buffer.from(parsed.data.fileBase64, "base64");
  if (buf.byteLength === 0) {
    return { ok: false, error: "Logo file was empty." };
  }
  if (buf.byteLength > MAX_BYTES) {
    return { ok: false, error: "Logo file must be under 2 MB." };
  }

  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false, error: "Only owners and admins can upload a logo." };
  }

  // Tenant-isolated path; one logo per company.
  const path = `${ctx.companyId}/logo.${ext === "jpeg" ? "jpg" : ext}`;
  const contentType = ext === "png" ? "image/png" : "image/jpeg";

  const { error: uploadErr } = await ctx.admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType, upsert: true });
  if (uploadErr) {
    return { ok: false, error: `Upload failed: ${uploadErr.message}` };
  }

  // Public URL with a cache-buster so the browser picks up the new bytes
  // after a re-upload to the same path.
  const { data: publicUrl } = ctx.admin.storage.from(BUCKET).getPublicUrl(path);
  const logoUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;

  const update: Record<string, unknown> = {
    logo_url: logoUrl,
    logo_aspect_ratio: parsed.data.aspectRatio,
  };
  if (parsed.data.mode) update.brand_mode = parsed.data.mode;

  const { error: dbErr } = await ctx.admin
    .from("companies")
    .update(update)
    .eq("id", ctx.companyId);
  if (dbErr) return { ok: false, error: dbErr.message };

  await bustInvoicePdfCache(ctx.admin, ctx.companyId);

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true, logoUrl, aspectRatio: parsed.data.aspectRatio };
}

export async function removeLogoAction(): Promise<ActionResult> {
  const ctx = await requireWriter();
  if (!ctx.ok) return ctx;
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false, error: "Only owners and admins can remove the logo." };
  }

  // Best-effort delete of both possible extensions. If the file is already
  // gone we don't care.
  await ctx.admin.storage
    .from(BUCKET)
    .remove([`${ctx.companyId}/logo.png`, `${ctx.companyId}/logo.jpg`]);

  const { error } = await ctx.admin
    .from("companies")
    .update({
      logo_url: null,
      logo_aspect_ratio: null,
      brand_mode: "text_only",
    })
    .eq("id", ctx.companyId);
  if (error) return { ok: false, error: error.message };

  await bustInvoicePdfCache(ctx.admin, ctx.companyId);

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
