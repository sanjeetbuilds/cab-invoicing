import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * `muted` flips to the outline variant. The list pages set it true
 * while the empty-state guide is showing so the guide's CTA is the
 * single bright primary on screen.
 */
export function AddClientButton({ muted = false }: { muted?: boolean }) {
  return (
    <Link
      href="/clients/new"
      className={cn(
        buttonVariants({ variant: muted ? "outline" : "default" }),
        "h-10",
      )}
    >
      <Plus className="h-4 w-4" />
      Add client
    </Link>
  );
}
