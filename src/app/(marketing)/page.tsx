import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowRight, Clock, Receipt } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "EasyBills, Invoicing for cab operators",
  description:
    "EasyBills helps small fleet operators generate GST-ready invoices, manage rate cards, and bill corporate clients, all in one place.",
};

// Marketing page, server-rendered, no auth required. Signed-in users
// bounce straight to their dashboard; signed-out users see the pitch.
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-col">
      <Hero />
      <Problems />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-8 pt-12 pb-12 sm:pt-24 sm:pb-20 lg:pt-32 lg:pb-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
        <div className="flex flex-col gap-6">
          <p className="text-[11px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
            Invoicing for cab operators
          </p>
          <h1 className="text-[32px] sm:text-[44px] lg:text-[48px] font-semibold text-foreground leading-[1.15] tracking-tight">
            Your month-end billing should take 15 minutes. Not 5 hours.
          </h1>
          <p className="text-base sm:text-lg text-foreground/70 leading-relaxed max-w-xl">
            EasyBills helps small fleet operators generate GST-ready invoices,
            manage rate cards, and bill corporate clients, all in one place.
            No Excel templates, no rate-card confusion, no month-end panic.
          </p>
          <div className="flex flex-col gap-3 mt-2">
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ size: "lg" }),
                "self-start h-12 px-6 text-base",
              )}
            >
              Try for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-medium text-primary hover:text-primary-hover"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 items-center lg:items-stretch">
          <InvoiceMockup />
          <p className="text-xs text-muted-foreground italic text-center">
            Generated in 90 seconds.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Inline visual mockup of the EasyBills invoice, uses the same column
 * structure and monospace numerics as the real PDF so the screenshot
 * feels truthful. All data is anonymized: "Sample Client Pvt Ltd",
 * "Your Company", placeholder GSTIN.
 */
function InvoiceMockup() {
  return (
    <div className="relative">
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          </div>
        </div>

        {/* Invoice body */}
        <div className="px-6 sm:px-8 py-6 font-mono text-[11px] leading-relaxed text-foreground/90">
          <div className="flex items-start justify-between border-b border-foreground pb-3">
            <span className="text-base font-bold tracking-wider text-foreground">
              YOUR COMPANY
            </span>
            <div className="text-right">
              <p className="font-semibold text-foreground tracking-wider">
                TAX INVOICE
              </p>
              <p className="text-[10px] text-muted-foreground">
                Original for Recipient
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 pb-3 border-b border-border/60 text-[10px]">
            <div>
              <p className="text-muted-foreground tracking-wider">BILLED BY</p>
              <p className="font-semibold text-foreground mt-1">Your Company</p>
              <p className="text-foreground/70">GSTIN 06XXXXXXXXXXX</p>
              <p className="text-foreground/70">+91 9999 00 0000</p>
            </div>
            <div>
              <p className="text-muted-foreground tracking-wider">BILLED TO</p>
              <p className="font-semibold text-foreground mt-1">
                Sample Client Pvt Ltd
              </p>
              <p className="text-foreground/70">GSTIN 06YYYYYYYYYYY</p>
              <p className="text-foreground/70">Booked by Mr. A. Sharma</p>
            </div>
            <div>
              <p className="text-muted-foreground tracking-wider">INVOICE</p>
              <p className="font-semibold text-foreground mt-1">No. 2147</p>
              <p className="text-foreground/70">Date 31/5/26</p>
              <p className="text-foreground/70">Period 1/5–28/5</p>
            </div>
          </div>

          <div className="grid grid-cols-[40px_56px_1fr_28px_46px_56px] gap-2 pt-3 pb-2 border-b border-foreground text-[9px] font-semibold text-foreground">
            <span>Date</span>
            <span>Vehicle</span>
            <span>Particulars</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
          </div>

          {[
            { d: "12/5", p: "80kms/8hrs", q: "-", r: "1,500", a: "1,500" },
            { d: "", p: "Additional kms", q: "69", r: "15", a: "1,035" },
            { d: "", p: "Additional hrs", q: "1.5", r: "100", a: "150" },
            { d: "", p: "Night Charges", q: "1", r: "300", a: "300" },
            { d: "18/5", p: "Airport T3 Drop", q: "1", r: "1,500", a: "1,500" },
            { d: "22/5", p: "80kms/8hrs", q: "-", r: "1,500", a: "1,500" },
            { d: "", p: "Additional kms", q: "45", r: "15", a: "675" },
          ].map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[40px_56px_1fr_28px_46px_56px] gap-2 py-1 text-[10px]"
            >
              <span className="text-foreground/80">{row.d}</span>
              <span className="text-foreground/60">
                {row.d ? "9083 Sonet" : ""}
              </span>
              <span>{row.p}</span>
              <span className="text-right">{row.q}</span>
              <span className="text-right">₹{row.r}</span>
              <span className="text-right">₹{row.a}</span>
            </div>
          ))}

          <div className="border-t border-foreground mt-3 pt-2">
            <div className="flex justify-between text-[10px]">
              <span>Total</span>
              <span className="font-semibold">₹6,660.00</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>CGST @ 2.5% Under RCM</span>
              <span>-</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>SGST @ 2.5% Under RCM</span>
              <span>-</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold border-t border-foreground mt-1 pt-1">
              <span>Net Amount</span>
              <span>₹6,660.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Problems() {
  const cards = [
    {
      icon: AlertCircle,
      title: "Excel chaos at month-end",
      body: "Tabs, formulas, mismatched rate cards, billing 30 trips by hand. One mistake costs you a month's profit.",
      fix: "Every trip becomes a line on a clean invoice with one tap.",
    },
    {
      icon: Receipt,
      title: "GST and RCM confusion",
      body: "CGST, SGST, IGST, RCM, and your corporate clients want it formatted just right.",
      fix: "EasyBills handles GST automatically based on the client's state. Every time.",
    },
    {
      icon: Clock,
      title: "Chasing payments",
      body: "Invoices sent late get paid late. By the time you're done with month-end, you're already a week behind.",
      fix: "Generate 30 invoices in 30 minutes. Get paid 7 days sooner.",
    },
  ] as const;

  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-8 py-12 sm:py-24 lg:py-32">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-semibold text-foreground tracking-tight">
            Built for the way you actually bill.
          </h2>
          <p className="text-base text-foreground/70 mt-3 mx-auto max-w-[600px]">
            Every cab operator deals with these. EasyBills handles them.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map(({ icon: Icon, title, body, fix }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3"
            >
              <Icon className="h-8 w-8 text-primary" strokeWidth={1.75} />
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                {body}
              </p>
              <p className="text-sm font-medium text-primary mt-1">→ {fix}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 sm:mt-16 flex flex-col items-center gap-3">
          <p className="text-xl font-semibold text-foreground">
            Start using EasyBills today
          </p>
          <p className="text-sm text-muted-foreground">
            Free to start. No credit card required.
          </p>
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 px-6 text-base mt-2",
            )}
          >
            Try for free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">© 2026 EasyBills</p>
        <nav className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <span>·</span>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
