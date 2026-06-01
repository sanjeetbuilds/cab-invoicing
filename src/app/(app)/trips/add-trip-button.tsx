import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * `disabled` greys + non-clickable when prereqs are missing.
 * `muted` flips to the outline variant so the empty-state guide
 * card holds the only bright primary on screen.
 */
export function AddTripButton({
  disabled,
  muted = false,
}: {
  disabled?: boolean;
  muted?: boolean;
}) {
  return (
    <Link
      href="/trips/new"
      className={cn(
        buttonVariants({ variant: muted ? "outline" : "default" }),
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Plus className="h-4 w-4" />
      Log trip
    </Link>
  );
}
