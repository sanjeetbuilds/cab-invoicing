import Link from "next/link";
import { ArrowRight, FileEdit } from "lucide-react";
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
import type {
  Client,
  Invoice,
  Trip,
} from "@/lib/supabase/types";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { SeedBanner } from "./seed/seed-banner";

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
  const { supabase, user, membership } = await requireMembership();

  const monthStart = firstOfThisMonthIso();

  const [
    { count: clientCount },
    { count: vehicleCount },
    { data: unbilledTrips },
    { data: unpaidInvoices },
    { data: thisMonthInvoices },
    { data: recentInvoices },
    { data: clients },
    { data: bulkDraft },
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
      .from("trips")
      .select("id, client_id")
      .eq("company_id", membership.company_id)
      .eq("invoiced", false)
      .returns<Pick<Trip, "id" | "client_id">[]>(),
    supabase
      .from("invoices")
      .select("net_amount")
      .eq("company_id", membership.company_id)
      .eq("status", "unpaid")
      .returns<Pick<Invoice, "net_amount">[]>(),
    supabase
      .from("invoices")
      .select("net_amount, status")
      .eq("company_id", membership.company_id)
      .gte("invoice_date", monthStart)
      .neq("status", "reversed")
      .returns<Pick<Invoice, "net_amount" | "status">[]>(),
    supabase
      .from("invoices")
      .select("*")
      .eq("company_id", membership.company_id)
      .order("invoice_date", { ascending: false })
      .order("invoice_number", { ascending: false })
      .limit(5)
      .returns<Invoice[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .returns<Pick<Client, "id" | "name">[]>(),
    supabase
      .from("bulk_drafts")
      .select("rows")
      .eq("company_id", membership.company_id)
      .eq("user_id", user.id)
      .maybeSingle<{ rows: unknown[] }>(),
  ]);

  const unbilledList = unbilledTrips ?? [];
  const unbilledCount = unbilledList.length;
  const outstanding = (unpaidInvoices ?? []).reduce(
    (s, i) => s + Number(i.net_amount ?? 0),
    0,
  );
  const billedThisMonth = (thisMonthInvoices ?? []).reduce(
    (s, i) => s + Number(i.net_amount ?? 0),
    0,
  );

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const unbilledByClient = new Map<string, number>();
  for (const t of unbilledList) {
    unbilledByClient.set(t.client_id, (unbilledByClient.get(t.client_id) ?? 0) + 1);
  }
  const unbilledRows = Array.from(unbilledByClient.entries())
    .map(([cid, count]) => ({
      client: clientById.get(cid),
      count,
    }))
    .filter((r) => r.client)
    .sort((a, b) => b.count - a.count);

  const bulkDraftRowCount = Array.isArray(bulkDraft?.rows) ? bulkDraft.rows.length : 0;
  const isFresh = (clientCount ?? 0) === 0 && (vehicleCount ?? 0) === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Your business at a glance." />

      {isFresh && <SeedBanner />}

      {bulkDraftRowCount > 0 && (
        <Card size="sm" className="border-warning/30 bg-warning-soft">
          <CardContent className="flex items-center justify-between gap-3 flex-row">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <FileEdit className="h-4 w-4 text-warning" />
              <span>
                You have a bulk-add draft with{" "}
                <strong>{bulkDraftRowCount}</strong> row
                {bulkDraftRowCount === 1 ? "" : "s"} in progress.
              </span>
            </div>
            <Link
              href="/trips/bulk"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Resume <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Primary action surfaces first — what does the user need to do next? */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Unbilled trips by client</CardTitle>
            <CardDescription className="hidden sm:block">
              Pick a client to build an invoice for them.
            </CardDescription>
          </div>
          {unbilledRows.length > 0 && (
            <CardAction>
              <Link
                href="/invoices/build"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Build invoice
              </Link>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {unbilledRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              All caught up — no uninvoiced trips.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Trips</TableHead>
                  <TableHead className="w-[160px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unbilledRows.map(({ client, count }) => (
                  <TableRow key={client!.id}>
                    <TableCell className="font-medium">{client!.name}</TableCell>
                    <TableCell className="text-right font-mono">{count}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/invoices/build?client=${client!.id}`}
                        className="text-sm font-medium text-primary hover:text-primary-hover"
                      >
                        Build invoice →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Unbilled trips"
          value={String(unbilledCount)}
          hint="trips not yet on an invoice"
          href="/trips"
        />
        <StatCard
          label="Outstanding"
          value={outstanding > 0 ? formatINR(outstanding) : "—"}
          hint={
            unpaidInvoices && unpaidInvoices.length > 0
              ? `${unpaidInvoices.length} unpaid invoice${
                  unpaidInvoices.length === 1 ? "" : "s"
                }`
              : "no unpaid invoices"
          }
          href="/invoices"
        />
        <StatCard
          label="Billed this month"
          value={billedThisMonth > 0 ? formatINR(billedThisMonth) : "—"}
          hint={`since ${fmtDate(monthStart)}`}
          href="/invoices?status=all"
        />
        <StatCard
          label="Clients · Vehicles"
          value={`${clientCount ?? 0} · ${vehicleCount ?? 0}`}
          hint="active companies you bill, your fleet"
        />
      </div>

      {recentInvoices && recentInvoices.length > 0 && (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent invoices</CardTitle>
            <CardDescription>Last 5 issued.</CardDescription>
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
              {recentInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    <a
                      href={`/api/invoices/${inv.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground hover:text-primary"
                    >
                      {inv.invoice_number}
                    </a>
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
        </CardContent>
      </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
}) {
  const body = (
    <Card
      className={
        href ? "hover:border-foreground/20 hover:shadow-card-hover transition-all" : ""
      }
    >
      <div className="flex flex-col gap-2">
        <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  switch (status) {
    case "paid":
      return <Badge variant="success">Paid</Badge>;
    case "unpaid":
      return <Badge variant="warning">Unpaid</Badge>;
    case "reversed":
      return <Badge variant="ghost">Reversed</Badge>;
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
  }
}
