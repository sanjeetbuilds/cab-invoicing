"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Top-right account menu. The trigger is the avatar + email (button,
 * never a link). On click it opens a small dropdown with Settings
 * and Sign out. Nothing navigates from the trigger itself, so there
 * is no way to land on a missing route from here.
 *
 * Both menu items use plain onClick + router.push instead of the
 * base-ui render={<Link>} pattern, which the previous version used,
 * because the Link's navigation didn't always fire reliably on
 * touch devices. router.push is bulletproof on every input.
 */
export function UserMenu({ email }: { email: string }) {
  const router = useRouter();

  function goToSettings() {
    router.push("/settings");
  }

  async function handleSignOut() {
    try {
      await fetch("/sign-out", { method: "POST" });
    } finally {
      // Land on the marketing landing, it has Sign in / Try for free
      // CTAs so the user has a clear next step, and middleware lets
      // signed-out users through.
      router.push("/");
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
        aria-label="Account menu"
      >
        <UserIcon className="h-4 w-4" />
        <span className="hidden sm:inline max-w-[180px] truncate">{email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="truncate">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={goToSettings}>
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
