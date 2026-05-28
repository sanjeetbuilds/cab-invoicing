import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function AddClientButton() {
  return (
    <Link href="/clients/new" className={buttonVariants()}>
      <Plus className="h-4 w-4" />
      Add client
    </Link>
  );
}
