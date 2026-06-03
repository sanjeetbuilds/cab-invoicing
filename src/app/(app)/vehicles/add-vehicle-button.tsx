import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * `muted` flips to the outline variant so the empty-state guide
 * card holds the only bright primary on screen.
 */
export function AddVehicleButton({ muted = false }: { muted?: boolean }) {
  return (
    <Link
      href="/vehicles/new"
      className={cn(
        buttonVariants({ variant: muted ? "outline" : "default" }),
        "h-10",
      )}
    >
      <Plus className="h-4 w-4" />
      Add vehicle
    </Link>
  );
}
