"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { BrandDisplay } from "./brand-display";
import type { BrandMode } from "@/lib/supabase/types";

/**
 * Desktop sidebar — shows every navigation item directly. Vertical
 * space is plentiful at lg+, so hiding items behind a "More" grouping
 * just adds clicks. The mobile bottom nav still uses the 5-tab + More
 * pattern because that's the only thing that fits a thumb-reach row.
 */
export function Sidebar({
  companyName,
  brandMode,
  logoUrl,
  logoAspectRatio,
}: {
  companyName: string;
  brandMode: BrandMode;
  logoUrl: string | null;
  logoAspectRatio: number | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="px-6 py-4 border-b border-border">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Company
        </p>
        <div className="mt-1">
          <BrandDisplay
            mode={brandMode}
            name={companyName}
            logoUrl={logoUrl}
            aspectRatio={logoAspectRatio}
            size="sidebar"
          />
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                active
                  ? "bg-[rgba(79,70,229,0.10)] text-[#4f46e5] font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors duration-150",
                  active ? "text-[#4f46e5]" : "text-muted-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-3 py-3">
        <Link
          href="/sign-out"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
            "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
          Sign out
        </Link>
      </div>
    </aside>
  );
}
