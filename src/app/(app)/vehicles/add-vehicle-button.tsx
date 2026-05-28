import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function AddVehicleButton() {
  return (
    <Link href="/vehicles/new" className={buttonVariants()}>
      <Plus className="h-4 w-4" />
      Add vehicle
    </Link>
  );
}
