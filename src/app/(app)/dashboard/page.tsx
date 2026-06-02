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
import { buttonVariants } from "@/components/ui/button";
import type { Company, Invoice } from "@/lib/supabase/types";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { FitText } from "@/components/ui/fit-text";
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
      .select("address, phone, gstin")
      .eq("id", membership.company_id)
      .maybeSingle<Pick<Company, "address" | "phone" | "gstin">>(),
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Your business at a glance." />

      {isFresh && <SeedBanner />}
      <SetupChecklist status={setupStatus} />

      {/* 4 stat tiles, 2-up on mobile, 4-up at lg+. auto-rows-fr +
          h-full on the tiles equalises height across rows so a tile
          with a one-line hint doesn't sit shorter than its neighbour. */}
      <div className="grid grid-cols-2 auto-rows-fr gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Unbilled trips"
          value={String(unbilledCount)}
          hint="Trips not yet on a bill."
          href="/trips"
          icon={Route}
          chipBg="#EEEDFE"
          chipFg="#3C3489"
        />
        <StatCard
          label="Outstanding"
          value={outstanding > 0 ? formatINR(outstanding) : "-"}
          hint={
            unpaidInvoices && unpaidInvoices.length > 0
              ? `${unpaidInvoices.length} unpaid invoice${
                  unpaidInvoices.length === 1 ? "" : "s"
                }.`
              : "No unpaid invoices."
          }
          href="/invoices"
          icon={Clock}
          chipBg="#FAEEDA"
          chipFg="#633806"
        />
        <StatCard
          label="Billed this month"
          value={billedThisMonth > 0 ? formatINR(billedThisMonth) : "-"}
          hint={`Since ${fmtDate(monthStart)}.`}
          href="/invoices"
          icon={ReceiptIndianRupee}
          chipBg="#E1F5EE"
          chipFg="#085041"
        />
        <StatCard
          label="Clients and cars"
          value={`${clientCount ?? 0} and ${vehicleCount ?? 0}`}
          hint="Your active clients and cars."
          icon={Users}
          chipBg="#E6F1FB"
          chipFg="#0C447C"
        />
      </div>

      {/* Recent invoices, last 5. The only list on the dashboard. */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent invoices</CardTitle>
            <CardDescription className="hidden sm:block">
              Last 5 issued.
            </CardDescription>
          </div>
          <CardAction>
            <Link
              href="/invoices"
              className="text-sm font-medium text-primary hover:text-primary-hover"
            >
              See all →
            </Link>
          </CardAction>
        </CardHeader>
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
    </div>
  );
}

/** Renders a stat value with a smaller, lighter ₹ prefix when the
 *  value is a rupee amount. The ₹ sits at 75% of the digit size and
 *  font-normal so any subtle font-fallback mismatch is invisible. */
function renderStatValue(value: string) {
  if (value.startsWith("₹")) {
    return (
      <>
        <span className="text-[0.75em] font-normal align-baseline mr-0.5">
          ₹
        </span>
        {value.slice(1)}
      </>
    );
  }
  return value;
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
  /** Hex fill for the small icon chip. Stays light enough that
   *  the dark icon reads in both light and dark mode. */
  chipBg: string;
  /** Hex foreground for the icon, paired with chipBg. */
  chipFg: string;
}) {
  // Layout per card: icon chip on top, big number, label, then a
  // muted sub-line. Numbers and labels stay in the normal text
  // colours, only the small chip carries the colour.
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
      <p className="overflow-hidden">
        <FitText
          text={value}
          maxPx={24}
          minPx={16}
          className="font-mono font-semibold tabular-nums text-foreground"
        >
          {renderStatValue(value)}
        </FitText>
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
