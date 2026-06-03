import Link from "next/link";
import {
  Car,
  Clock,
  FileText,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { RupeeValue } from "./rupee-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Company, Invoice } from "@/lib/supabase/types";
import { formatINR } from "@/lib/format";
import { SeedBanner } from "../seed/seed-banner";
import { SetupChecklist, type SetupStatus } from "./setup-checklist";

export const metadata = {
  title: "Dashboard",
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

/** Start of the current Indian financial year as an ISO date. The
 *  year runs 1 April to 31 March, so from April onward it starts this
 *  calendar year, and in January to March it started last year. */
function firstOfFinancialYearIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  // getMonth() is zero based, so April is 3.
  const fyStartYear = d.getMonth() >= 3 ? y : y - 1;
  return `${fyStartYear}-04-01`;
}

/** Friendly long date for the welcome strip, e.g. "Monday, 2 June 2026". */
function fmtToday(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Up to two decimals with Indian grouping, trailing zeros dropped, so
 *  2.5 stays 2.5 and 2 stays 2 rather than 2.50 or 2.00. */
function trimDecimals(x: number): string {
  return x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Short rupee figure that stays inside a small box whatever the size.
 *  Below one lakh: the full figure with Indian commas, like ₹84,200.
 *  One lakh up to a crore: lakh, like ₹1.13 L or ₹2.5 L.
 *  A crore and above: crore, like ₹2.46 Cr. */
function formatInrShort(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(n);
  if (abs < 100000) {
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }
  if (abs < 10000000) {
    return `₹${trimDecimals(n / 100000)} L`;
  }
  return `₹${trimDecimals(n / 10000000)} Cr`;
}

/** Exact rupee figure with Indian commas, like ₹2,45,67,890. Paise are
 *  shown only when the amount is not a whole number of rupees. */
function formatInrFull(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export default async function DashboardPage() {
  const { supabase, membership } = await requireMembership();

  const fyStart = firstOfFinancialYearIso();

  // Calmer query set: just the four stats + the last five invoices.
  // No hero-prompt logic, no activity-feed merge, no unbilled-by-client
  // breakdown, the dashboard is a glance-summary, not a worklist.
  const [
    { count: clientCount },
    { count: vehicleCount },
    { count: rateCardCount },
    { count: unbilledTripsCount },
    { count: tripCount },
    { count: invoiceCount },
    { data: unpaidInvoices },
    { data: thisYearInvoices },
    { data: recentInvoices },
    { data: companyMeta },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("company_id", membership.company_id),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", membership.company_id),
    supabase
      .from("rate_cards")
      .select("id", { count: "exact", head: true })
      .eq("company_id", membership.company_id),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("company_id", membership.company_id)
      .eq("invoiced", false),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("company_id", membership.company_id),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", membership.company_id),
    supabase
      .from("invoices")
      .select("net_amount")
      .eq("company_id", membership.company_id)
      .eq("status", "unpaid")
      .returns<Pick<Invoice, "net_amount">[]>(),
    supabase
      .from("invoices")
      .select("net_amount")
      .eq("company_id", membership.company_id)
      .gte("invoice_date", fyStart)
      // Only issued invoices count as billed. Drafts are not issued and
      // reversed ones are undone, so both are left out.
      .in("status", ["unpaid", "paid"])
      .returns<Pick<Invoice, "net_amount">[]>(),
    supabase
      .from("invoices")
      .select("*")
      .eq("company_id", membership.company_id)
      // Drafts are not issued, so they stay out of the recent list.
      .neq("status", "draft")
      .order("invoice_date", { ascending: false })
      .order("invoice_number", { ascending: false })
      .limit(5)
      .returns<Invoice[]>(),
    supabase
      .from("companies")
      .select("name, address, phone, gstin")
      .eq("id", membership.company_id)
      .maybeSingle<Pick<Company, "name" | "address" | "phone" | "gstin">>(),
  ]);

  const setupStatus: SetupStatus = {
    companyDetails: Boolean(companyMeta?.address || companyMeta?.phone),
    hasClient: (clientCount ?? 0) > 0,
    hasVehicle: (vehicleCount ?? 0) > 0,
    hasRateCard: (rateCardCount ?? 0) > 0,
    hasTrip: (tripCount ?? 0) > 0,
    hasInvoice: (invoiceCount ?? 0) > 0,
  };

  const unbilledCount = unbilledTripsCount ?? 0;
  const outstanding = (unpaidInvoices ?? []).reduce(
    (s, i) => s + Number(i.net_amount ?? 0),
    0,
  );
  const billedThisYear = (thisYearInvoices ?? []).reduce(
    (s, i) => s + Number(i.net_amount ?? 0),
    0,
  );

  const isFresh = (clientCount ?? 0) === 0 && (vehicleCount ?? 0) === 0;
  const recent = recentInvoices ?? [];
  const companyName = companyMeta?.name ?? "there";
  const todayLabel = fmtToday();
  const cc = clientCount ?? 0;
  const vc = vehicleCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome strip: anchors the page without a heavy header
          banner. Title-style greeting, muted date below. */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {companyName}.
        </h1>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
      </div>

      {isFresh && <SeedBanner />}
      <SetupChecklist status={setupStatus} />

      {/* Four metric boxes. Two columns on phones, four in a row on
          desktop. White cards with a soft shadow, coloured title and
          icon, dark number. No gradients. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBox color="#534AB7" icon={FileText} title="Unbilled">
          <span className="text-2xl font-medium text-foreground whitespace-nowrap">
            {unbilledCount.toLocaleString("en-IN")}
          </span>
        </MetricBox>
        <MetricBox color="#993C1D" icon={Clock} title="Outstanding">
          <RupeeValue
            short={formatInrShort(outstanding)}
            full={formatInrFull(outstanding)}
          />
        </MetricBox>
        <MetricBox color="#0F6E56" icon={Receipt} title="Billed this year">
          <RupeeValue
            short={formatInrShort(billedThisYear)}
            full={formatInrFull(billedThisYear)}
          />
        </MetricBox>
        <MetricBox color="#185FA5" icon={Users} title="Clients and cars">
          <div className="flex items-center gap-5">
            <MiniStat icon={Users} value={cc} />
            <MiniStat icon={Car} value={vc} />
          </div>
        </MetricBox>
      </div>

      {/* Recent invoices, last 5. The only list on the dashboard. */}
      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Recent invoices"
          subtitle="The last five you issued."
          actionHref="/invoices"
          actionLabel="See all"
        />
        <Card>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">
                No invoices yet.{" "}
                <Link
                  href="/invoices/build"
                  className="font-medium text-primary hover:text-primary-hover"
                >
                  Make your first invoice.
                </Link>
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-foreground hover:text-primary"
                        >
                          {inv.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {fmtDate(inv.invoice_date)}
                      </TableCell>
                      <TableCell>{inv.client_name}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatINR(Number(inv.net_amount))}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={inv.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/** Section header used between dashboard panels. Larger and more
 *  confident than the older inline CardTitle, gives the page rhythm
 *  by sitting outside the card. */
function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="text-sm font-medium text-primary hover:text-primary-hover shrink-0"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/** A single metric box: white card with a soft shadow, a coloured
 *  header row (icon and title), and the value pinned to the bottom.
 *  The value is passed in so a box can hold a number, a rupee figure,
 *  or two small stats. Only font-normal and font-medium are used. */
function MetricBox({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** Colour for the header icon and title. */
  color: string;
  /** The value shown at the bottom of the box. */
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border-[0.5px] border-border bg-card px-4 py-3.5 min-h-[108px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2" style={{ color }}>
        <Icon className="h-[18px] w-[18px]" />
        <span className="text-[13px] font-medium">{title}</span>
      </div>
      <div className="mt-auto pt-2">{children}</div>
    </div>
  );
}

/** Icon plus count for the clients and cars box. The icon labels the
 *  number, so there is no caption word. */
function MiniStat({ icon: Icon, value }: { icon: LucideIcon; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-[18px] w-[18px]" style={{ color: "#185FA5" }} />
      <span className="text-xl font-medium text-foreground whitespace-nowrap">
        {value.toLocaleString("en-IN")}
      </span>
    </span>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  switch (status) {
    case "paid":
      return <Badge variant="success">Paid</Badge>;
    case "unpaid":
      return <Badge variant="warning">Unpaid</Badge>;
    case "reversed":
      return <Badge variant="ghost">Undone</Badge>;
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
  }
}
