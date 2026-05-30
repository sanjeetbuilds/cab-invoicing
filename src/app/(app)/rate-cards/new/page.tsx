import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { CarType, Client, TripMode } from "@/lib/supabase/types";
import { RateCardForm } from "../rate-card-form";

export const metadata = { title: "Add rate card" };

const CAR_TYPES: CarType[] = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"];
const MODES: TripMode[] = ["local", "outstation", "transfer", "package"];

export default async function NewRateCardPage({
  searchParams,
}: {
  searchParams: Promise<{
    client?: string;
    client_id?: string;
    car_type?: string;
    mode?: string;
  }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { client, client_id, car_type, mode } = await searchParams;

  const [{ data: clients }, { data: planRows }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("company_id", membership.company_id)
      .order("name", { ascending: true })
      .returns<Pick<Client, "id" | "name">[]>(),
    supabase
      .from("rate_cards")
      .select("plan_name")
      .eq("company_id", membership.company_id)
      .not("plan_name", "is", null)
      .returns<{ plan_name: string | null }[]>(),
  ]);

  const planNameHistory = Array.from(
    new Set(
      (planRows ?? [])
        .map((r) => r.plan_name?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  ).sort();

  const defaultCarType = (CAR_TYPES as readonly string[]).includes(car_type ?? "")
    ? (car_type as CarType)
    : undefined;
  const defaultMode = (MODES as readonly string[]).includes(mode ?? "")
    ? (mode as TripMode)
    : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/rate-cards"
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Rate cards
          </Link>
        </p>
        <PageHeader
          title="Add rate card"
          description="One row per (client × car type × mode). Transfer and Package modes also key on plan name."
        />
      </div>
      <RateCardForm
        clients={clients ?? []}
        defaultClientId={client_id ?? client}
        defaultCarType={defaultCarType}
        defaultMode={defaultMode}
        planNameHistory={planNameHistory}
      />
    </div>
  );
}
