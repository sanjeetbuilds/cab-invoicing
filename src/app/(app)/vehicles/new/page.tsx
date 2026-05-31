import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { VehicleForm } from "../vehicle-form";

export const metadata = { title: "Add vehicle" };

export default async function NewVehiclePage() {
  await requireMembership();
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
        <PageHeader
          title="Add vehicle"
          description="Vehicles you drive, own or attached vendor cars."
        />
      </div>
      <VehicleForm />
    </div>
  );
}
