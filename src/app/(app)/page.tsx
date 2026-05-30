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
import { buttonVariants } from "@/components/ui/button";
import type {
  Client,
  Invoice,
  Quotation,
  Trip,
} from "@/lib/supabase/types";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { SeedBanner } from "./seed/seed-banner";

type Hero =
  | { kind: "month_end"; trips: number; clients: number }
  | { kind: "overdue"; amount: number; clients: number }
  | {
      kind: "expiring";
      count: number;
      first: {
        id: string;
        number: string;
        client_id: string | null;
        client_name: string | null;
        valid_until: string | null;
      };
    }
  | { kind: "unbilled"; count: number }
  | { kind: "all_clear" };

export const metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

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

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function isoDaysFromNow(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysLeftThisMonth(): number {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return last - d.getDate();
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return iso.slice(0, 10);
}

interface ActivityRow {
  ts: string;
  message: React.ReactNode;
  href: string;
}

export default async function DashboardPage() {
  const { supabase, user, membership } = await requireMembership();

  const monthStart = firstOfThisMonthIso();
  const fifteenDaysAgo = isoDaysAgo(15);
  const sevenDaysFromNow = isoDaysFromNow(7);

  const [
    { count: clientCount },
    { count: vehicleCount },
    { data: unbilledTrips },
    { data: unpaidInvoices },
    { data: thisMonthInvoices },
    { data: clients },
    { data: bulkDraft },
    // New for Phase 2 dashboard intelligence:
    { data: overdueInvoices },
    { data: expiringQuotations },
    { data: recentInvoices },
    { data: recentTrips },
    { data: recentClients },
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
    // Overdue: unpaid + issued more than 15 days ago.
    supabase
      .from("invoices")
      .select("id, client_name, net_amount, invoice_date")
      .eq("company_id", membership.company_id)
      .eq("status", "unpaid")
      .lte("invoice_date", fifteenDaysAgo)
      .returns<
        Pick<Invoice, "id" | "client_name" | "net_amount" | "invoice_date">[]
      >(),
    // Quotations expiring in the next 7 days.
    supabase
      .from("quotations")
      .select("id, number, client_id, client_name, valid_until")
      .eq("company_id", membership.company_id)
      .in("status", ["draft", "sent"])
      .not("valid_until", "is", null)
      .gte("valid_until", todayIso())
      .lte("valid_until", sevenDaysFromNow)
      .returns<
        Pick<
          Quotation,
          "id" | "number" | "client_id" | "client_name" | "valid_until"
        >[]
      >(),
    // Recent activity sources — last 5 of each, merged in JS.
    supabase
      .from("invoices")
      .select("id, invoice_number, client_name, created_at, paid_date, status")
      .eq("company_id", membership.company_id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<
        Pick<
          Invoice,
          | "id"
          | "invoice_number"
          | "client_name"
          | "created_at"
          | "paid_date"
          | "status"
        >[]
      >(),
    supabase
      .from("trips")
      .select("id, client_id, total_kms, created_at, vehicle_id")
      .eq("company_id", membership.company_id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<
        Pick<Trip, "id" | "client_id" | "total_kms" | "created_at" | "vehicle_id">[]
      >(),
    supabase
      .from("clients")
      .select("id, name, created_at")
      .eq("company_id", membership.company_id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<Pick<Client, "id" | "name" | "created_at">[]>(),
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

  // ─────────────── HERO PROMPT LOGIC ───────────────
  // First match wins; subsequent rules are skipped.
  const overdueList = overdueInvoices ?? [];
  const overdueTotal = overdueList.reduce(
    (s, i) => s + Number(i.net_amount ?? 0),
    0,
  );
  const overdueDistinctClients = new Set(
    overdueList.map((i) => i.client_name).filter(Boolean),
  ).size;
  const expiringList = expiringQuotations ?? [];
  const monthEndDaysLeft = daysLeftThisMonth();

  type Hero =
    | { kind: "month_end"; trips: number; clients: number }
    | { kind: "overdue"; amount: number; clients: number }
    | { kind: "expiring"; count: number; first: (typeof expiringList)[number] }
    | { kind: "unbilled"; count: number }
    | { kind: "all_clear" };

  let hero: Hero;
  if (monthEndDaysLeft <= 4 && unbilledCount > 0) {
    hero = {
      kind: "month_end",
      trips: unbilledCount,
      clients: unbilledRows.length,
    };
  } else if (overdueList.length > 0) {
    hero = {
      kind: "overdue",
      amount: overdueTotal,
      clients: overdueDistinctClients,
    };
  } else if (expiringList.length > 0) {
    hero = {
      kind: "expiring",
      count: expiringList.length,
      first: expiringList[0],
    };
  } else if (unbilledCount > 0) {
    hero = { kind: "unbilled", count: unbilledCount };
  } else {
    hero = { kind: "all_clear" };
  }
  // Promote the "Unbilled trips by client" table directly under the hero
  // when the prompt is about that exact work.
  const promoteUnbilled = hero.kind === "month_end" || hero.kind === "unbilled";

  // ─────────────── RECENT ACTIVITY FEED ───────────────
  // Merge events from invoices / trips / clients into a single list,
  // sort by timestamp desc, keep the top 10.
  const activity: ActivityRow[] = [];
  for (const inv of recentInvoices ?? []) {
    activity.push({
      ts: inv.created_at,
      href: `/api/invoices/${inv.id}/pdf`,
      message: (
        <>
          Issued invoice{" "}
          <span className="font-mono font-medium text-foreground">
            {inv.invoice_number}
          </span>{" "}
          for <span className="font-medium text-foreground">{inv.client_name}</span>
        </>
      ),
    });
    if (inv.status === "paid" && inv.paid_date) {
      activity.push({
        ts: inv.paid_date,
        href: `/api/invoices/${inv.id}/pdf`,
        message: (
          <>
            Marked invoice{" "}
            <span className="font-mono font-medium text-foreground">
              {inv.invoice_number}
            </span>{" "}
            as paid
          </>
        ),
      });
    }
  }
  for (const t of recentTrips ?? []) {
    const cname = clientById.get(t.client_id)?.name ?? "—";
    activity.push({
      ts: t.created_at,
      href: `/trips/${t.id}/edit`,
      message: (
        <>
          Logged trip for{" "}
          <span className="font-medium text-foreground">{cname}</span>
          {" "}({t.total_kms}km)
        </>
      ),
    });
  }
  for (const c of recentClients ?? []) {
    activity.push({
      ts: c.created_at,
      href: "/clients",
      message: (
        <>
          Added client{" "}
          <span className="font-medium text-foreground">{c.name}</span>
        </>
      ),
    });
  }
  activity.sort((a, b) => b.ts.localeCompare(a.ts));
  const activityTop = activity.slice(0, 10);

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

      {/* ───────── Hero "What's next" prompt — single most useful action ───────── */}
      {!isFresh && <HeroPrompt hero={hero} />}

      {/* "Unbilled trips by client" sits directly under the hero when the
          hero is about that work. Otherwise it stays in its usual spot
          below the stat tiles. */}
      {promoteUnbilled && (
        <UnbilledByClient unbilledRows={unbilledRows} />
      )}

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
          href="/invoices"
        />
        <StatCard
          label="Clients · Vehicles"
          value={`${clientCount ?? 0} · ${vehicleCount ?? 0}`}
          hint="active companies you bill, your fleet"
        />
      </div>

      {!promoteUnbilled && (
        <UnbilledByClient unbilledRows={unbilledRows} />
      )}

      {/* ───────── Recent activity — last 10 events ───────── */}
      {activityTop.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription className="hidden sm:block">
                Last few things that happened on this account.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="-mx-4 -mb-4 sm:-mx-6 sm:-mb-6 px-0 pb-0">
            <ul className="divide-y divide-border">
              {activityTop.map((row, i) => (
                <li key={i}>
                  <Link
                    href={row.href}
                    target={row.href.startsWith("/api/") ? "_blank" : undefined}
                    rel={row.href.startsWith("/api/") ? "noreferrer" : undefined}
                    className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 hover:bg-muted/40 active:bg-muted transition-colors"
                  >
                    <span className="text-sm text-muted-foreground min-w-0 flex-1">
                      {row.message}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                      {relativeTime(row.ts)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HeroPrompt({ hero }: { hero: Hero }) {
  const wrap = (body: React.ReactNode, action: React.ReactNode) => (
    <Card className="border-accent-soft bg-accent-soft/40">
      <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm sm:text-base">{body}</div>
        <div className="shrink-0">{action}</div>
      </CardContent>
    </Card>
  );

  switch (hero.kind) {
    case "month_end":
      return wrap(
        <>
          <span className="font-semibold text-foreground">
            It&apos;s month-end —
          </span>{" "}
          <span className="font-mono font-semibold">{hero.trips}</span> trip
          {hero.trips === 1 ? "" : "s"} ready to invoice across{" "}
          <span className="font-mono font-semibold">{hero.clients}</span>{" "}
          client{hero.clients === 1 ? "" : "s"}.
        </>,
        <Link
          href="/invoices/build"
          className={buttonVariants()}
        >
          Build invoices now <ArrowRight className="h-4 w-4" />
        </Link>,
      );
    case "overdue":
      return wrap(
        <>
          <span className="font-mono font-semibold text-foreground">
            {formatINR(hero.amount)}
          </span>{" "}
          overdue from{" "}
          <span className="font-mono font-semibold">{hero.clients}</span>{" "}
          client{hero.clients === 1 ? "" : "s"} —{" "}
          <span className="text-muted-foreground">
            invoices unpaid over 15 days
          </span>
          .
        </>,
        <Link href="/invoices" className={buttonVariants()}>
          View overdue <ArrowRight className="h-4 w-4" />
        </Link>,
      );
    case "expiring":
      return wrap(
        <>
          <span className="font-mono font-semibold">{hero.count}</span>{" "}
          quotation{hero.count === 1 ? "" : "s"} expiring soon —{" "}
          <span className="font-medium text-foreground">
            {hero.first.client_name ?? "—"}
          </span>{" "}
          on{" "}
          <span className="font-mono">
            {hero.first.valid_until
              ? new Date(hero.first.valid_until).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : "—"}
          </span>
          .
        </>,
        <Link href="/quotations" className={buttonVariants()}>
          Review <ArrowRight className="h-4 w-4" />
        </Link>,
      );
    case "unbilled":
      return wrap(
        <>
          <span className="font-mono font-semibold">{hero.count}</span> trip
          {hero.count === 1 ? "" : "s"} ready to invoice.
        </>,
        <Link href="/invoices/build" className={buttonVariants()}>
          Build invoice <ArrowRight className="h-4 w-4" />
        </Link>,
      );
    case "all_clear":
      return wrap(
        <>
          <span className="font-semibold text-foreground">
            All caught up
          </span>{" "}
          — no pending work.
        </>,
        <div className="flex gap-2">
          <Link
            href="/trips/new"
            className={buttonVariants({ variant: "outline" })}
          >
            Log trip
          </Link>
          <Link
            href="/invoices"
            className={buttonVariants({ variant: "outline" })}
          >
            View invoices
          </Link>
        </div>,
      );
  }
}

function UnbilledByClient({
  unbilledRows,
}: {
  unbilledRows: { client: { id: string; name: string } | undefined; count: number }[];
}) {
  return (
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
      size="sm"
    >
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

