import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IndianRupee, Upload, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSticky } from "@/components/ui/list-sticky";
import { PageHeader } from "@/components/ui/page-header";
import { SamplePreview } from "@/components/ui/sample-preview";
import { ClientsSampleRows } from "@/components/ui/sample-rows";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/supabase/types";
import { AddClientButton } from "./add-client-button";
import { ClientRowActions } from "./client-row-actions";

export const metadata = { title: "Clients" };

/** Shared column widths between the sticky column header (in the
 *  ListSticky chrome) and the data table below. null = auto. */
const CLIENT_COL_WIDTHS: (string | null)[] = [
  null,    // Name (auto, fills remaining)
  "120px", // State
  "160px", // GSTIN
  "140px", // Contact
  "95px",  // GST
  "80px",  // Actions
];

function ClientColGroup() {
  return (
    <colgroup>
      {CLIENT_COL_WIDTHS.map((w, i) => (
        <col key={i} style={w ? { width: w } : undefined} />
      ))}
    </colgroup>
  );
}

type ClientGroup = "regular" | "quick" | "all";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { group: groupParam } = await searchParams;
  const group: ClientGroup =
    groupParam === "quick" || groupParam === "all" ? groupParam : "regular";

  const baseQuery = supabase
    .from("clients")
    .select("*")
    .eq("company_id", membership.company_id);
  if (group === "regular") baseQuery.eq("is_quick_customer", false);
  if (group === "quick") baseQuery.eq("is_quick_customer", true);

  const [{ data: clients, error }, { count: quickCount }, { count: totalClients }] =
    await Promise.all([
      baseQuery.order("name", { ascending: true }).returns<Client[]>(),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("company_id", membership.company_id)
        .eq("is_quick_customer", true),
      // Lifetime check across every group, not just the current one.
      // An operator with quick customers only must read as experienced
      // when they land on the default "regular" tab.
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("company_id", membership.company_id),
    ]);

  const TABS: { value: ClientGroup; label: string; count?: number }[] = [
    { value: "regular", label: "Regular" },
    { value: "quick", label: "One-time", count: quickCount ?? 0 },
    { value: "all", label: "All" },
  ];

  const list = clients ?? [];
  const filteredEmpty = list.length === 0;
  const isFirstTime = (totalClients ?? 0) === 0;
  const showingSamples = filteredEmpty && isFirstTime;
  const showingCalmEmpty = filteredEmpty && !isFirstTime;

  return (
    <div className="flex flex-col gap-6">
      <ListSticky>
        <PageHeader
          title="Clients"
          description="The companies you bill. We use their state to work out the GST."
        >
          <Link
            href="/bulk-import?scope=clients"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Upload className="h-4 w-4" />
            Import
          </Link>
          <Link
            href="/rate-cards"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <IndianRupee className="h-4 w-4" />
            Bulk edit rates
          </Link>
          <AddClientButton muted={showingSamples} />
        </PageHeader>

        {/* One-time customers can outnumber regular clients in a
            high-volume retail shop. Tabs let the user keep the
            regular list calm by default with a one-tap toggle. */}
        {(quickCount ?? 0) > 0 && (
          <div className="flex gap-2">
            {TABS.map((t) => {
              const active = t.value === group;
              const href =
                t.value === "regular"
                  ? "/clients"
                  : `/clients?group=${t.value}`;
              return (
                <Link
                  key={t.value}
                  href={href}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-accent-soft text-accent-foreground border-accent-soft"
                      : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  {t.label}
                  {typeof t.count === "number" && t.count > 0 && (
                    <span className="ml-2 text-xs opacity-70">
                      ({t.count})
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Column header row, item 4 in the sticky stack on
            desktop. Shares column widths with the data table
            below via table-fixed + ClientColGroup. */}
        {list.length > 0 && (
          <div className="hidden md:block -mb-3">
            <table className="w-full table-fixed text-sm">
              <ClientColGroup />
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">GST</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
            </table>
          </div>
        )}
      </ListSticky>

      {error && (
        <p className="text-sm text-destructive">Failed to load: {error.message}</p>
      )}

      {showingSamples && (
        <SamplePreview
          icon={<Users className="h-4 w-4" />}
          iconChipBg="#E6F1FB"
          iconChipFg="#0C447C"
          title="This is where your clients live."
          body="Add the companies you bill. We use their state to work out the GST."
          primary={{ label: "Add your first client", href: "/clients/new" }}
          importHref="/bulk-import?scope=clients"
          setupHint={{ step: 2, total: 6 }}
        >
          <ClientsSampleRows />
        </SamplePreview>
      )}

      {showingCalmEmpty && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {group === "regular"
              ? "No regular clients here yet."
              : group === "quick"
                ? "No one-time customers here yet."
                : "No clients here."}
          </CardContent>
        </Card>
      )}

      {list.length > 0 && (
        <>
          {/* Desktop table, thead lives in the sticky chrome
              above. Shared widths via ClientColGroup. */}
          <div className="hidden md:block rounded-xl bg-card shadow-card overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <ClientColGroup />
              <TableBody>
                {list.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">
                      <span className="inline-flex items-center gap-2">
                        {c.name}
                        {c.is_quick_customer && (
                          <Badge variant="outline" className="text-[10px]">
                            One-time
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.state}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.gstin || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.default_booked_by || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {c.is_rcm ? (
                        <Badge variant="accent">RCM</Badge>
                      ) : (
                        <Badge variant="default">Charged</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <ClientRowActions client={c} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-4 md:gap-5">
            {list.map((c) => (
              <Card key={c.id} size="sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate inline-flex items-center gap-2">
                      {c.name}
                      {c.is_quick_customer && (
                        <Badge variant="outline" className="text-[10px]">
                          One-time
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.state}
                      {c.gstin ? ` • ${c.gstin}` : ""}
                    </p>
                    {c.default_booked_by && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.default_booked_by}
                      </p>
                    )}
                    <div className="mt-2">
                      {c.is_rcm ? (
                        <Badge variant="accent">RCM</Badge>
                      ) : (
                        <Badge variant="default">Charged</Badge>
                      )}
                    </div>
                  </div>
                  <ClientRowActions client={c} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
