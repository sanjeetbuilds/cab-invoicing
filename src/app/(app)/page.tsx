import { requireMembership } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SeedBanner } from "./seed/seed-banner";

export const metadata = {
  title: "Dashboard — Krishna Cabs",
};

export default async function DashboardPage() {
  const { supabase, membership } = await requireMembership();

  // Quick counts to decide whether to show the seed banner and to fill
  // placeholder stats. Real stats come in later milestones.
  const [{ count: clientCount }, { count: vehicleCount }, { count: unbilledTripsCount }] =
    await Promise.all([
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
        .select("id", { count: "exact", head: true })
        .eq("company_id", membership.company_id)
        .eq("invoiced", false),
    ]);

  const isFresh = (clientCount ?? 0) === 0 && (vehicleCount ?? 0) === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your business at a glance.
        </p>
      </div>

      {isFresh && <SeedBanner />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unbilled trips</CardDescription>
            <CardTitle className="text-2xl">{unbilledTripsCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">trips not yet on an invoice</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clients</CardDescription>
            <CardTitle className="text-2xl">{clientCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">companies you bill</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vehicles</CardDescription>
            <CardTitle className="text-2xl">{vehicleCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">own + attached fleet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-2xl">₹—</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              shows once invoices exist
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming next</CardTitle>
          <CardDescription>
            Milestone 4 adds the trips screen: single-trip form, list with
            filters, and the laptop-only bulk-add modal with auto-saved draft.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
