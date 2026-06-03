import Link from "next/link";
import {
  Building2,
  Car,
  Check,
  Clock,
  FileText,
  Users,
  type LucideIcon,
} from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
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

/** Rupee amount in Indian style with a leading rupee symbol, e.g.
 *  ₹58,082.50, ₹2,14,500. Uses toLocaleString("en-IN") so grouping
 *  follows the lakh and crore convention. */
function formatRupee(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
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
          desktop. Flat tinted fills, dark text, a small solid icon
          chip. No shadows, no gradients. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBox
          href="/trips"
          icon={FileText}
          label="Unbilled"
          value={unbilledCount.toLocaleString("en-IN")}
          tint="#EEEDFE"
          chip="#534AB7"
          labelColor="#3C3489"
          valueColor="#26215C"
        />
        <MetricBox
          href="/invoices"
          icon={Clock}
          label="Outstanding"
          value={formatRupee(outstanding)}
          tint="#FAECE7"
          chip="#993C1D"
          labelColor="#712B13"
          valueColor="#4A1B0C"
        />
        <MetricBox
          href="/invoices"
          icon={Check}
          label="Billed this month"
          value={formatRupee(billedThisMonth)}
          tint="#E1F5EE"
          chip="#0F6E56"
          labelColor="#085041"
          valueColor="#04342C"
        />
        <ClientsAndCarsBox clients={cc} cars={vc} />
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

/** A single tinted metric box: solid icon chip top left, label under
 *  it, value pinned to the bottom. Flat fill, no shadow, no gradient.
 *  Only font-normal and font-medium are used. */
function MetricBox({
  href,
  icon: Icon,
  label,
  value,
  tint,
  chip,
  labelColor,
  valueColor,
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
  value: string;
  /** Soft tint fill for the whole box. */
  tint: string;
  /** Solid colour for the icon chip. */
  chip: string;
  /** Label text colour. */
  labelColor: string;
  /** Value text colour. */
  valueColor: string;
}) {
  const box = (
    <div
      className="flex h-full flex-col rounded-lg p-4 min-h-[116px]"
      style={{ backgroundColor: tint }}
    >
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-lg"
        style={{ width: 34, height: 34, backgroundColor: chip, color: "#FFFFFF" }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="mt-3 text-[13px] font-medium" style={{ color: labelColor }}>
        {label}
      </p>
      <p
        className="mt-auto pt-2 text-2xl font-medium"
        style={{ color: valueColor }}
      >
        {value}
      </p>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {box}
    </Link>
  ) : (
    box
  );
}

/** The fourth box. No rupee value: instead two small icon stats, the
 *  client count and the car count, side by side. */
function ClientsAndCarsBox({
  clients,
  cars,
}: {
  clients: number;
  cars: number;
}) {
  return (
    <div
      className="flex h-full flex-col rounded-lg p-4 min-h-[116px]"
      style={{ backgroundColor: "#E6F1FB" }}
    >
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-lg"
        style={{
          width: 34,
          height: 34,
          backgroundColor: "#185FA5",
          color: "#FFFFFF",
        }}
      >
        <Users className="h-[18px] w-[18px]" />
      </span>
      <p className="mt-3 text-[13px] font-medium" style={{ color: "#0C447C" }}>
        Clients and cars
      </p>
      <div className="mt-auto pt-2 flex items-start gap-6">
        <MiniStat icon={Building2} value={clients} caption="clients" />
        <MiniStat icon={Car} value={cars} caption="cars" />
      </div>
    </div>
  );
}

/** Icon plus count, with a small muted caption underneath. */
function MiniStat({
  icon: Icon,
  value,
  caption,
}: {
  icon: LucideIcon;
  value: number;
  caption: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1.5">
        <Icon className="h-[18px] w-[18px]" style={{ color: "#185FA5" }} />
        <span className="text-xl font-medium" style={{ color: "#042C53" }}>
          {value.toLocaleString("en-IN")}
        </span>
      </span>
      <span className="text-[11px] text-muted-foreground">{caption}</span>
    </div>
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
