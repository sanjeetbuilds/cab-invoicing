import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaxiMunshiLanding } from "./taximunshi-landing";

export const metadata = {
  title: "TaxiMunshi · Taxi billing and invoicing for Indian cab operators",
  description:
    "Turn duty slips, client rate cards and extra km/hour charges into accurate corporate invoices. Share on WhatsApp or email, export for your CA. Free for 3 months.",
  openGraph: {
    title: "TaxiMunshi · Month-end billing? Munshi sambhaal lega.",
    description: "Duty records, client-wise rate cards, quotations and corporate invoices for Indian cab operators.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
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
