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
import { PageHeader } from "@/components/ui/page-header";
import type { Client, Quotation } from "@/lib/supabase/types";

export const metadata = { title: "Quotations" };

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

function StatusBadge({ status }: { status: Quotation["status"] }) {
  switch (status) {
    case "accepted":
      return <Badge variant="success">Accepted</Badge>;
    case "sent":
      return <Badge variant="accent">Sent</Badge>;
    case "draft":
      return <Badge variant="default">Draft</Badge>;
    case "expired":
      return <Badge variant="ghost">Expired</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
  }
}

export default async function QuotationsPage() {
  const { supabase, membership } = await requireMembership();

  const [{ data: quotations }, { data: clients }] = await Promise.all([
    supabase
      .from("quotations")
      .select("*")
      .eq("company_id", membership.company_id)
      .order("date", { ascending: false })
      .returns<Quotation[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const list = quotations ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Quotations"
        description="Send rates to clients. Accepting one creates or updates their rate cards."
      >
        <Link href="/quotations/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          New quotation
        </Link>
      </PageHeader>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No quotations yet.{" "}
            <Link
              href="/quotations/new"
              className="font-medium text-primary hover:text-primary-hover"
            >
              Create one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/quotations/${q.id}`}
                      className="text-foreground hover:text-primary"
                    >
                      {q.number}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {fmtDate(q.date)}
                  </TableCell>
                  <TableCell>
                    {q.client_id ? clientById.get(q.client_id) ?? "—" : (q.client_name ?? "—")}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {fmtDate(q.valid_until)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={q.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
