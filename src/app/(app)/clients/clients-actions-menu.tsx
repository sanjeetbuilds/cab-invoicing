"use client";

import { useRouter } from "next/navigation";
import { IndianRupee, MoreVertical, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Mobile only overflow menu for the Clients page. Add client stays a
 * primary button on its own; Import and Bulk edit rates move in here so
 * the action row fits on one line on a phone. Desktop keeps all three as
 * buttons, so this is hidden there.
 */
export function ClientsActionsMenu() {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More client actions"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted"
      >
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem
          onClick={() => router.push("/bulk-import?scope=clients")}
        >
          <Upload className="h-4 w-4" />
          Import
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/rate-cards")}>
          <IndianRupee className="h-4 w-4" />
          Bulk edit rates
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
