import { Plus_Jakarta_Sans, Caveat, Noto_Sans_Devanagari } from "next/font/google";

// Scoped to the landing page only — the rest of the app keeps Inter
// (see src/app/layout.tsx). Applied via className on the page's root
// element so these never leak into the signed-in product.

export const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-landing-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const caveat = Caveat({
  variable: "--font-landing-script",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

// Only the "मु" glyph in the logo mark needs this — weight 800 only.
export const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-landing-devanagari",
  subsets: ["devanagari"],
  weight: ["800"],
  display: "swap",
});
