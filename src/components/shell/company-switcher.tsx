"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchCompanyAction } from "./switch-company-action";

export interface SwitcherCompany {
  id: string;
  name: string;
  suspended: boolean;
}

/** Only renders when the signed-in user belongs to more than one company. */
export function CompanySwitcher({
  companies,
  currentId,
}: {
  companies: SwitcherCompany[];
  currentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (companies.length <= 1) return null;

  const current = companies.find((c) => c.id === currentId);

  function pick(id: string) {
    if (id === currentId) return;
    startTransition(async () => {
      await switchCompanyAction(id);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch company"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground hover:bg-muted disabled:opacity-60"
      >
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate max-w-[140px]">{current?.name ?? "Company"}</span>
        {current?.suspended && (
          <span className="text-xs text-destructive font-medium">Paused</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        {companies.map((c) => (
          <DropdownMenuItem key={c.id} onClick={() => pick(c.id)}>
            {c.id === currentId && <Check className="h-4 w-4" />}
            <span className="truncate flex-1">{c.name}</span>
            {c.suspended && (
              <span className="text-xs text-destructive font-medium">Paused</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
