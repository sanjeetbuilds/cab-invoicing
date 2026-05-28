import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import type { Vehicle } from "@/lib/supabase/types";
import { VehicleForm } from "../../vehicle-form";

export const metadata = { title: "Edit vehicle" };

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, membership } = await requireMembership();
  const { id } = await params;

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .maybeSingle<Vehicle>();

  if (!vehicle) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/vehicles"
            className="font-medium text-primary hover:text-primary-hover"
          >
            ← Vehicles
          </Link>
        </p>
        <PageHeader title={`Edit ${vehicle.number}`} description="Update vehicle details." />
      </div>
      <VehicleForm vehicle={vehicle} />
    </div>
  );
}
