import { notFound } from "next/navigation";
import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import type {
  Client,
  Company,
  Invoice,
  RateCard,
  Trip,
  Vehicle,
} from "@/lib/supabase/types";
import { EditInvoiceForm } from "./edit-invoice-form";

export const metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .maybeSingle<Invoice>();

  if (!invoice) notFound();
  if (invoice.status === "paid" || invoice.status === "reversed") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Paid and undone invoices are closed records and can&apos;t be
          edited.{" "}
          <Link href={`/invoices/${id}`} className="underline">
            Back to invoice
          </Link>
          .
        </CardContent>
      </Card>
    );
  }
  if (!invoice.client_id) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          This invoice has no client on record and can&apos;t be edited.{" "}
          <Link href={`/invoices/${id}`} className="underline">
            Back to invoice
          </Link>
          .
        </CardContent>
      </Card>
    );
  }
  const clientId = invoice.client_id;

  // Trips originally billed on this invoice, found via the lines (not
  // trips.invoice_id) so an undone invoice — whose trips were already
  // freed back to the open pool — still resolves its original set.
  const { data: lineRows } = await supabase
    .from("invoice_lines")
    .select("trip_id")
    .eq("invoice_id", id);
  const oldTripIds = Array.from(
    new Set(
      (lineRows ?? [])
        .map((l) => l.trip_id)
        .filter((tid): tid is string => tid != null),
    ),
  );

  let ownTrips: Trip[] = [];
  if (oldTripIds.length > 0) {
    const { data } = await supabase
      .from("trips")
      .select("*")
      .eq("company_id", membership.company_id)
      .in("id", oldTripIds)
      .returns<Trip[]>();
    ownTrips = data ?? [];
  }

  const [
    { data: uninvoicedTrips },
    { data: client },
    { data: company },
    { data: rateCards },
    { data: vehicles },
  ] = await Promise.all([
    supabase
      .from("trips")
      .select("*")
      .eq("company_id", membership.company_id)
      .eq("client_id", clientId)
      .eq("invoiced", false)
      .returns<Trip[]>(),
    supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("company_id", membership.company_id)
      .maybeSingle<Client>(),
    supabase
      .from("companies")
      .select("*")
      .eq("id", membership.company_id)
      .maybeSingle<Company>(),
    supabase
      .from("rate_cards")
      .select("*")
      .eq("company_id", membership.company_id)
      .eq("client_id", clientId)
      .returns<RateCard[]>(),
    supabase
      .from("vehicles")
      .select("id, number, type")
      .eq("company_id", membership.company_id)
      .returns<Pick<Vehicle, "id" | "number" | "type">[]>(),
  ]);

  if (!client || !company) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Client not found.{" "}
          <Link href={`/invoices/${id}`} className="underline">
            Back to invoice
          </Link>
          .
        </CardContent>
      </Card>
    );
  }

  const tripMap = new Map<string, Trip>();
  for (const t of uninvoicedTrips ?? []) tripMap.set(t.id, t);
  for (const t of ownTrips) tripMap.set(t.id, t);
  const trips = Array.from(tripMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const fullNumber = `${company.invoice_prefix ?? ""}${invoice.invoice_number}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href={`/invoices/${id}`} className="underline">
            ← Back to invoice
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          Edit invoice {fullNumber}
        </h1>
        <p className="text-sm text-muted-foreground">
          {client.name}. Adjust the date, charges, or trips, then save.
        </p>
      </div>

      <EditInvoiceForm
        invoice={invoice}
        client={client}
        company={company}
        trips={trips}
        selectedTripIds={oldTripIds}
        rateCards={rateCards ?? []}
        vehicles={vehicles ?? []}
        prefix={company.invoice_prefix ?? ""}
      />
    </div>
  );
}
