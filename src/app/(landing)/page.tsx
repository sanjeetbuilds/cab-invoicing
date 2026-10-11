import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaxiMunshiLanding } from "./taximunshi-landing";

const OG_TITLE = "TaxiMunshi · Month-end billing? Munshi sambhaal lega.";
const OG_DESCRIPTION =
  "Duty slips, rate cards and GST invoices for Indian cab operators — sorted in minutes. Free for 3 months.";

export const metadata = {
  title: "TaxiMunshi · Taxi billing and invoicing for Indian cab operators",
  description:
    "Turn duty slips, client rate cards and extra km/hour charges into accurate corporate invoices. Share on WhatsApp or email, export for your CA. Free for 3 months.",
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: "https://www.taximunshi.com",
    siteName: "TaxiMunshi",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/og/og-image.png",
        width: 1200,
        height: 630,
        alt: "TaxiMunshi — taxi billing and invoicing for Indian cab operators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ["/og/og-image.png"],
  },
};

// Marketing page, server-rendered, no auth required. Signed-in users
// bounce straight to their dashboard; signed-out users see the pitch.
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return <TaxiMunshiLanding />;
}
