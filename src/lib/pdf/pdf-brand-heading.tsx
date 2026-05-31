/**
 * Renders the company's brand at the top-left of an invoice / quotation
 * PDF. Three modes, plain styled text, just the uploaded logo, or
 * logo + text. Falls back to text whenever the prefetched logo buffer
 * is missing.
 */
import { Image, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { BrandMode } from "@/lib/supabase/types";
import type { PdfBrand } from "./load-brand";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: "#1a1a1a",
  },
  withTextText: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: "#1a1a1a",
    marginLeft: 10,
  },
});

const LOGO_ONLY_HEIGHT = 56; // ~80 CSS px, fills the masthead band
const LOGO_ONLY_MAX_WIDTH = 240;
const LOGO_WITH_TEXT_HEIGHT = 36; // ~50 CSS px
const LOGO_WITH_TEXT_MAX_WIDTH = 140;

export function PdfBrandHeading({
  brand,
  companyName,
  fontFamily,
}: {
  brand: PdfBrand | undefined;
  companyName: string;
  /** Font family registered by the caller (invoice + quotation share one). */
  fontFamily: string;
}) {
  const mode: BrandMode = brand?.mode ?? "text_only";
  const logo = brand?.logo ?? null;

  // Effective mode after fallback, if a non-text mode is set but the
  // logo failed to load, we render text so the doc isn't left blank.
  const effective: BrandMode =
    mode !== "text_only" && !logo ? "text_only" : mode;

  if (effective === "text_only") {
    return (
      <Text style={[styles.text, { fontFamily }]}>
        {(companyName ?? "").toUpperCase()}
      </Text>
    );
  }

  if (effective === "logo_only" && logo) {
    const width = Math.min(
      LOGO_ONLY_HEIGHT * logo.aspectRatio,
      LOGO_ONLY_MAX_WIDTH,
    );
    return (
      <Image
        src={{ data: logo.data, format: logo.format }}
        style={{ height: LOGO_ONLY_HEIGHT, width }}
      />
    );
  }

  // logo_with_text, guaranteed by the fallback above that logo is set.
  const width = Math.min(
    LOGO_WITH_TEXT_HEIGHT * logo!.aspectRatio,
    LOGO_WITH_TEXT_MAX_WIDTH,
  );
  return (
    <View style={styles.row}>
      <Image
        src={{ data: logo!.data, format: logo!.format }}
        style={{ height: LOGO_WITH_TEXT_HEIGHT, width }}
      />
      <Text style={[styles.withTextText, { fontFamily }]}>
        {(companyName ?? "").toUpperCase()}
      </Text>
    </View>
  );
}
