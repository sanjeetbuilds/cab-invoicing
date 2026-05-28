import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Client } from "@/lib/supabase/types";

export function AddRateCardButton({
  defaultClientId,
  label = "Add rate card",
  variant = "default",
  size = "default",
}: {
  clients?: Pick<Client, "id" | "name">[];
  defaultClientId?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
}) {
  const href = defaultClientId
    ? `/rate-cards/new?client=${defaultClientId}`
    : "/rate-cards/new";
  return (
    <Link href={href} className={buttonVariants({ variant, size })}>
      <Plus className="h-4 w-4" />
      {label}
    </Link>
  );
}
