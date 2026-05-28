import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddTripButton({ disabled }: { disabled?: boolean }) {
  return (
    <Link
      href="/trips/new"
      className={cn(
        buttonVariants(),
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Plus className="h-4 w-4" />
      Log trip
    </Link>
  );
}
