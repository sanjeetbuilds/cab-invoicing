import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/supabase/types";

export function AddRateCardButton({
  defaultClientId,
  label = "Add rate card",
  variant = "default",
  size = "default",
  className,
}: {
  clients?: Pick<Client, "id" | "name">[];
  defaultClientId?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
  className?: string;
}) {
  const href = defaultClientId
    ? `/rate-cards/new?client=${defaultClientId}`
    : "/rate-cards/new";
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
      <Plus className="h-4 w-4" />
      {label}
    </Link>
  );
}
