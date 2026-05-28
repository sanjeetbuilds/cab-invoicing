import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import type {
  Client,
  RateCard,
  Vehicle,
} from "@/lib/supabase/types";
import { BulkAddClient } from "./bulk-add-client";
import { emptyDraftRow, type BulkDraftRow } from "./draft";

export const metadata = { title: "Bulk add trips — Krishna Cabs" };

interface BulkDraft {
  rows: BulkDraftRow[];
}

export default async function BulkAddPage() {
  const { supabase, user, membership } = await requireMembership();

  const [
    { data: clients },
    { data: vehicles },
    { data: rateCards },
    { data: draft },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
    supabase
      .from("vehicles")
      .select("id, number, type, active")
      .eq("company_id", membership.company_id)
      .order("number", { ascending: true })
      .returns<Pick<Vehicle, "id" | "number" | "type" | "active">[]>(),
    supabase
      .from("rate_cards")
      .select("*")
      .eq("company_id", membership.company_id)
      .returns<RateCard[]>(),
    supabase
      .from("bulk_drafts")
      .select("rows")
      .eq("company_id", membership.company_id)
      .eq("user_id", user.id)
      .maybeSingle<BulkDraft>(),
  ]);

  const initialRows: BulkDraftRow[] =
    Array.isArray(draft?.rows) && draft.rows.length > 0
      ? (draft.rows as BulkDraftRow[]).map((r) => ({ ...emptyDraftRow(), ...r }))
      : Array.from({ length: 3 }, () => emptyDraftRow());

  const clientList = clients ?? [];
  const vehicleList = vehicles ?? [];
  const noPrereqs = clientList.length === 0 || vehicleList.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/trips" className="underline">← Trips</Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          Bulk add trips
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter many duties in one go. Your work auto-saves while you type.
          Complete rows save as trips; incomplete rows stay in the draft.
        </p>
      </div>

      {/* Mobile: show a hint instead of the giant table */}
      <Card className="lg:hidden">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Bulk entry is laptop-only. Open this page on a wider screen, or use{" "}
          <Link href="/trips" className="underline">Log trip</Link> for a single
          duty.
        </CardContent>
      </Card>

      {noPrereqs && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Add at least one{" "}
            <Link href="/clients" className="underline">client</Link> and one{" "}
            <Link href="/vehicles" className="underline">vehicle</Link> before
            bulk-adding trips.
          </CardContent>
        </Card>
      )}

      <div className="hidden lg:block">
        <BulkAddClient
          initialRows={initialRows}
          clients={clientList}
          vehicles={vehicleList}
          rateCards={rateCards ?? []}
          disabled={noPrereqs}
        />
      </div>
    </div>
  );
}
