import Link from "next/link";
import { notFound } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { formatINRBlank } from "@/lib/format";
import type {
  Client,
  Company,
  Quotation,
  QuotationLine,
} from "@/lib/supabase/types";
import { QuotationActions } from "./quotation-actions";

export const metadata = { title: "Quotation" };

function fmtDate(iso: string | null | undefined) {
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

export default async function QuotationViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const [{ data: q }, { data: lines }, { data: company }] = await Promise.all([
    supabase
      .from("quotations")
      .select("*")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Quotation>(),
    supabase
      .from("quotation_lines")
      .select("*")
      .eq("quotation_id", id)
      .order("sort_order", { ascending: true })
      .returns<QuotationLine[]>(),
    supabase
      .from("companies")
      .select("*")
      .eq("id", membership.company_id)
      .maybeSingle<Company>(),
  ]);

  if (!q || !company) notFound();

  let clientName = q.client_name;
  if (q.client_id) {
    const { data } = await supabase
      .from("clients")
      .select("name")
      .eq("id", q.client_id)
      .maybeSingle<Pick<Client, "name">>();
    clientName = data?.name ?? q.client_name;
  }

  const lineList = lines ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/quotations"
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Quotations
          </Link>
        </p>
        <PageHeader title={`Quotation ${q.number}`}>
          <StatusBadge status={q.status} />
        </PageHeader>
      </div>

      <Card>
        <CardContent className="py-6 px-6">
          {/* 3-column letterhead */}
          <div className="grid grid-cols-12 gap-4 pb-3 border-b border-black">
            <div className="col-span-12 sm:col-span-4">
              <p className="font-bold text-base tracking-wide">
                {(company.name ?? "").toUpperCase()}
              </p>
              {company.phone && <p className="text-xs mt-1">{company.phone}</p>}
              {company.email && <p className="text-xs">{company.email}</p>}
              {company.address && (
                <p className="text-xs mt-2 whitespace-pre-line">{company.address}</p>
              )}
            </div>
            <div className="col-span-12 sm:col-span-5">
              <p className="font-semibold text-sm">
                To- {(clientName ?? "").toUpperCase()}
              </p>
              {q.client_address && (
                <p className="text-xs mt-1 whitespace-pre-line">{q.client_address}</p>
              )}
              <p className="text-xs mt-1">
                {q.client_gstin ? `GSTIN ${q.client_gstin}` : "GSTIN NA"}
              </p>
              {q.client_contact && (
                <p className="text-xs mt-2">Contact: {q.client_contact}</p>
              )}
            </div>
            <div className="col-span-12 sm:col-span-3 text-right">
              {company.gstin && (
                <p className="text-xs font-bold mb-3">GSTIN {company.gstin}</p>
              )}
              <p className="font-bold">QUOTATION- {q.number}</p>
              <p className="text-xs mt-1">Date: {fmtDate(q.date)}</p>
              {q.valid_until && (
                <p className="text-xs mt-1 text-muted-foreground">
                  Valid until: {fmtDate(q.valid_until)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-sm border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Base ₹</TableHead>
                  <TableHead className="text-right">Base km/hr</TableHead>
                  <TableHead className="text-right">Extra km/hr ₹</TableHead>
                  <TableHead className="text-right">Night ₹</TableHead>
                  <TableHead className="text-right">Per km ₹</TableHead>
                  <TableHead className="text-right">Driver TA ₹</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineList.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.car_type}</TableCell>
                    <TableCell>
                      {l.mode === "local" ? (
                        <Badge variant="default">Local</Badge>
                      ) : (
                        <Badge variant="accent">Outstation</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINRBlank(l.base_rate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {l.base_kms != null && l.base_hours != null
                        ? `${l.base_kms}km / ${l.base_hours}hr`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.extra_km != null || l.extra_hour != null
                        ? `${formatINRBlank(l.extra_km)} / ${formatINRBlank(l.extra_hour)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINRBlank(l.night)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINRBlank(l.per_km)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatINRBlank(l.driver_ta)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {q.notes && (
            <div className="mt-6 text-sm">
              <p className="font-semibold text-foreground">Notes</p>
              <p className="text-muted-foreground whitespace-pre-line mt-1">
                {q.notes}
              </p>
            </div>
          )}

          {(company.terms_quotation ?? []).length > 0 && (
            <>
              <Separator className="my-6" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground">TERMS &amp; CONDITIONS</p>
                {(company.terms_quotation ?? []).map((t, i) => (
                  <p key={i} className="mt-0.5">• {t}</p>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 text-right text-xs text-muted-foreground">
            Issued by {company.name}. Net amount per duty depends on actual kms,
            hours, night and TA per the rate sheet above.
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 justify-end">
        <a
          href={`/api/quotations/${q.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          Download PDF
        </a>
        <QuotationActions
          quotationId={q.id}
          number={q.number}
          status={q.status}
        />
      </div>

      <div className="text-right text-xs">
        <Link
          href={`/quotations/${q.id}/edit`}
          className="font-medium text-primary hover:text-primary-hover"
        >
          Edit this quotation →
        </Link>
      </div>
    </div>
  );
}
