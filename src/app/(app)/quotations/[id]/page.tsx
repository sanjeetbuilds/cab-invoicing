import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Pencil } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Client, Quotation, QuotationLine } from "@/lib/supabase/types";
import { QuotationActions } from "./quotation-actions";

export const metadata = { title: "Quotation" };

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const [{ data: q }, { data: lines }, { data: clients }] = await Promise.all([
    supabase
      .from("quotations")
      .select("*")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Quotation>(),
    supabase
      .from("quotation_lines")
      .select("car_type, mode")
      .eq("quotation_id", id)
      .returns<Pick<QuotationLine, "car_type" | "mode">[]>(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .returns<Pick<Client, "id" | "name">[]>(),
  ]);

  if (!q) notFound();

  const clientName = q.client_id
    ? (clients ?? []).find((c) => c.id === q.client_id)?.name ?? null
    : q.client_name;

  const lineCount = lines?.length ?? 0;
  const pdfUrl = `/api/quotations/${q.id}/pdf`;

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-5">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/quotations"
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Quotations
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          Quotation {q.number}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={q.status} />
          <span className="text-sm text-muted-foreground">
            Dated {fmtDate(q.date)}
          </span>
          {q.valid_until && (
            <span className="text-sm text-muted-foreground">
              · Valid till {fmtDate(q.valid_until)}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <QuotationActions
          quotationId={q.id}
          number={q.number}
          status={q.status}
        />
        <Link
          href={`/quotations/${q.id}/edit`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "flex-1 sm:flex-initial",
          )}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </div>

      <Card>
        <CardContent className="py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              For
            </p>
            <p className="text-lg font-semibold leading-tight">
              {clientName ?? "—"}
            </p>
            {q.client_gstin && (
              <p className="font-mono text-xs text-muted-foreground">
                GSTIN {q.client_gstin}
              </p>
            )}
            {q.client_contact && (
              <p className="text-xs text-muted-foreground">
                {q.client_contact}
              </p>
            )}
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs border-t border-border pt-3">
            <dt className="text-muted-foreground">Number</dt>
            <dd className="font-mono text-right">{q.number}</dd>
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-mono text-right">{fmtDate(q.date)}</dd>
            {q.valid_until && (
              <>
                <dt className="text-muted-foreground">Valid until</dt>
                <dd className="font-mono text-right">
                  {fmtDate(q.valid_until)}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Rate lines</dt>
            <dd className="font-mono text-right">{lineCount || "—"}</dd>
          </dl>
        </CardContent>
      </Card>

      <a
        href={pdfUrl}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: "default" }) + " h-12 text-base"}
      >
        <FileText className="size-5" />
        Open PDF
      </a>

      <p className="text-center text-xs text-muted-foreground">
        Opens in your phone&apos;s PDF viewer. Use the share / save icon there
        to download.
      </p>
    </div>
  );
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
