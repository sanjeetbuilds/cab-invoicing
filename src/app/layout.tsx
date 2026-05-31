import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// latin-ext is the subset that carries ₹ (U+20B9). Without it the
// browser falls back to a system font for the rupee glyph, which
// renders at a different size and baseline, Inter and JetBrains
// Mono both include ₹ once latin-ext is loaded.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EasyBills",
    template: "%s, EasyBills",
  },
  description: "Cab invoicing for small fleet operators.",
  applicationName: "EasyBills",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // iOS Safari PWA tags. Next.js folds these into <head>.
  appleWebApp: {
    capable: true,
    title: "EasyBills",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

// viewport-fit=cover is what tells iOS Safari to extend the page under
// the notch and home indicator. With that on, our env(safe-area-inset-*)
// padding rules in the top bar / bottom nav actually receive non-zero
// values on notched devices, so chrome elements sit clear of the
// hardware. Without it, iOS pillarboxes the page and the insets are 0.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
