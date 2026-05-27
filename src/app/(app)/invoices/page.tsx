import Link from "next/link";
import { Plus } from "lucide-react";
import { requireMembership } from "@/lib/auth";
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
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Client, Invoice } from "@/lib/supabase/types";

export const metadata = { title: "Invoices — Krishna Cabs" };

type StatusFilter = "all" | "unpaid" | "paid" | "reversed";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "reversed", label: "Reversed" },
  { value: "all", label: "All" },
];

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const params = await searchParams;
  const status: StatusFilter =
    params.status === "all" ||
    params.status === "paid" ||
    params.status === "reversed"
      ? params.status
      : "unpaid";

  const q = supabase
    .from("invoices")
    .select("*")
    .eq("company_id", membership.company_id)
    .order("invoice_date", { ascending: false })
    .order("invoice_number", { ascending: false });
  if (status !== "all") q.eq("status", status);

  const [{ data: invoices, error }, { data: company }] = await Promise.all([
    q.returns<Invoice[]>(),
    supabase
      .from("companies")
      .select("invoice_prefix")
      .eq("id", membership.company_id)
      .maybeSingle<{ invoice_prefix: string | null }>(),
  ]);

  const list = invoices ?? [];
  const prefix = company?.invoice_prefix ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Issued invoices. Numbers are atomic — never reused.
          </p>
        </div>
        <Link href="/invoices/build" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Build invoice
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const active = f.value === status;
          return (
            <Link
              key={f.value}
              href={f.value === "unpaid" ? "/invoices" : `/invoices?status=${f.value}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card hover:bg-accent",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive">Failed to load: {error.message}</p>
      )}

      {!error && list.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {status === "all"
              ? "No invoices yet — "
              : `No ${status} invoices — `}
            <Link href="/invoices/build" className="underline">
              build one
            </Link>
            .
          </CardContent>
        </Card>
      )}

      {list.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer">
                    <TableCell className="font-mono font-medium">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {prefix}{inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono">{fmtDate(inv.invoice_date)}</TableCell>
                    <TableCell>{inv.client_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.period_from && inv.period_to
                        ? `${fmtDate(inv.period_from)} – ${fmtDate(inv.period_to)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {inv.gst_mode === "RCM" && <Badge variant="outline">RCM</Badge>}
                      {inv.gst_mode === "IGST" && <Badge variant="secondary">IGST</Badge>}
                      {inv.gst_mode === "CGST_SGST" && <Badge variant="secondary">CGST+SGST</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {fmtINR(inv.net_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={inv.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {list.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`}>
                <Card>
                  <CardContent className="py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-semibold">
                        {prefix}{inv.invoice_number}
                      </p>
                      <p className="text-sm">{inv.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(inv.invoice_date)} ·{" "}
                        {inv.period_from && inv.period_to
                          ? `${fmtDate(inv.period_from)}–${fmtDate(inv.period_to)}`
                          : "no period"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm">{fmtINR(inv.net_amount)}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  switch (status) {
    case "paid":
      return <Badge>Paid</Badge>;
    case "unpaid":
      return <Badge variant="secondary">Unpaid</Badge>;
    case "reversed":
      return <Badge variant="outline" className="text-muted-foreground">Reversed</Badge>;
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
  }
}
