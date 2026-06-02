import Link from "next/link";
import {
  Clock,
  ReceiptIndianRupee,
  Route,
  Users,
  type LucideIcon,
} from "lucide-react";
import { requireMembership } from "@/lib/auth";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
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

function firstOfThisMonthIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
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

/** Rupee amount with Indian grouping and a clean trailing zero rule,
 *  ₹2,14,500 when the number is whole, ₹58,082.50 when there is a
 *  paise tail. Used in the metric cards so big amounts read warmly
 *  without forcing .00 on every clean number. */
function formatINRClean(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "₹0";
  const hasFraction = Math.round(n * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(n);
}

export default async function DashboardPage() {
  const { supabase, membership } = await requireMembership();

  const monthStart = firstOfThisMonthIso();

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
    { data: thisMonthInvoices },
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
      .gte("invoice_date", monthStart)
      .neq("status", "reversed")
      .returns<Pick<Invoice, "net_amount">[]>(),
    supabase
      .from("invoices")
      .select("*")
      .eq("company_id", membership.company_id)
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
  const billedThisMonth = (thisMonthInvoices ?? []).reduce(
    (s, i) => s + Number(i.net_amount ?? 0),
    0,
  );

  const isFresh = (clientCount ?? 0) === 0 && (vehicleCount ?? 0) === 0;
  const recent = recentInvoices ?? [];
  const companyName = companyMeta?.name ?? "there";
  const todayLabel = fmtToday();
  const cc = clientCount ?? 0;
  const vc = vehicleCount ?? 0;
  const clientsAndCars = `${cc} client${cc === 1 ? "" : "s"}, ${vc} car${vc === 1 ? "" : "s"}`;

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

      {/* 4 stat tiles, 2-up on mobile, 4-up at lg+. Distinct tinted
          chips per metric, white cards on the flat surface. */}
      <div className="grid grid-cols-2 auto-rows-fr gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Unbilled trips"
          value={String(unbilledCount)}
          hint="Trips not yet on a bill."
          href="/trips"
          icon={Route}
          chipBg="#EDE9FE"
          chipFg="#6D28D9"
        />
        <StatCard
          label="Outstanding"
          value={outstanding > 0 ? formatINRClean(outstanding) : "₹0"}
          hint={
            unpaidInvoices && unpaidInvoices.length > 0
              ? `${unpaidInvoices.length} unpaid invoice${
                  unpaidInvoices.length === 1 ? "" : "s"
                }.`
              : "No unpaid invoices."
          }
          href="/invoices"
          icon={Clock}
          chipBg="#FEF3C7"
          chipFg="#B45309"
        />
        <StatCard
          label="Billed this month"
          value={billedThisMonth > 0 ? formatINRClean(billedThisMonth) : "₹0"}
          hint={`Since ${fmtDate(monthStart)}.`}
          href="/invoices"
          icon={ReceiptIndianRupee}
          chipBg="#D1FAE5"
          chipFg="#047857"
        />
        <StatCard
          label="Clients and cars"
          value={clientsAndCars}
          hint="Active records in your account."
          icon={Users}
          chipBg="#DBEAFE"
          chipFg="#1D4ED8"
        />
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

function StatCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  chipBg,
  chipFg,
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
  icon: LucideIcon;
  /** Hex fill for the small icon chip. */
  chipBg: string;
  /** Hex foreground for the icon, paired with chipBg. */
  chipFg: string;
}) {
  // Layout per card: icon chip on top, big number in the app's
  // regular font, label, then a muted sub-line. Numbers and labels
  // stay in the normal text colour. Only the chip carries the
  // colour.
  const card = (
    <Card
      className={cn(
        "h-full min-h-[150px] gap-0 flex flex-col",
        href && "hover:shadow-card-hover transition-shadow",
      )}
    >
      <span
        aria-hidden
        className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full mb-3"
        style={{ backgroundColor: chipBg, color: chipFg }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="text-lg sm:text-xl font-semibold tracking-tight text-foreground truncate">
        {value}
      </p>
      <p className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium mt-1">
        {label}
      </p>
      <p className="text-xs text-muted-foreground mt-auto pt-2">{hint}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
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
