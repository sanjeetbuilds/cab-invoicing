import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandMode } from "@/lib/supabase/types";

/** Shape of the brand block handed to the PDF doc. `logo` is null when
 *  the mode is text_only or we couldn't fetch the bytes — the doc treats
 *  both cases the same and renders text. */
export interface PdfBrand {
  mode: BrandMode;
  logo: {
    data: Buffer;
    format: "png" | "jpg";
    aspectRatio: number;
  } | null;
}

const BUCKET = "company-logos";

/** Pull the storage path out of a public Supabase URL like
 *  `https://…/storage/v1/object/public/company-logos/{cid}/logo.png?v=…`.
 *  Returns null if the URL doesn't look like one of ours. */
function logoPathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  const tail = url.slice(idx + marker.length);
  const q = tail.indexOf("?");
  return q >= 0 ? tail.slice(0, q) : tail;
}

/** Best-effort: returns text_only brand if logo bytes can't be loaded.
 *  Never throws — a missing logo should not break PDF rendering. */
export async function loadPdfBrand(
  admin: SupabaseClient,
  brandMode: BrandMode,
  logoUrl: string | null,
  aspectRatio: number | null,
): Promise<PdfBrand> {
  if (brandMode === "text_only" || !logoUrl) {
    return { mode: "text_only", logo: null };
  }
  const path = logoPathFromUrl(logoUrl);
  if (!path) return { mode: "text_only", logo: null };

  try {
    const { data, error } = await admin.storage.from(BUCKET).download(path);
    if (error || !data) return { mode: "text_only", logo: null };
    const buf = Buffer.from(await data.arrayBuffer());
    const format: "png" | "jpg" = path.toLowerCase().endsWith(".png")
      ? "png"
      : "jpg";
    return {
      mode: brandMode,
      logo: {
        data: buf,
        format,
        aspectRatio: aspectRatio ?? 1,
      },
    };
  } catch {
    return { mode: "text_only", logo: null };
  }
}
