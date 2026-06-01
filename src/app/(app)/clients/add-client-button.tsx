import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * `muted` flips to the outline variant. The list pages set it true
 * while the empty-state guide is showing so the guide's CTA is the
 * single bright primary on screen.
 */
export function AddClientButton({ muted = false }: { muted?: boolean }) {
  return (
    <Link
      href="/clients/new"
      className={buttonVariants({ variant: muted ? "outline" : "default" })}
    >
      <Plus className="h-4 w-4" />
      Add client
    </Link>
  );
}
