"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_PRIMARY, SECONDARY } from "./nav-items";

const SECONDARY_HREFS = new Set(SECONDARY.map((n) => n.href));

export function Sidebar({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  // "More" is active whenever the current path lives inside the
  // secondary destinations (Fleet, Settings) or the /more page itself.
  const onSecondary =
    pathname.startsWith("/more") ||
    SECONDARY_HREFS.has(pathname) ||
    SECONDARY.some((s) => pathname.startsWith(s.href + "/"));

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Company
        </p>
        <p
          className="font-semibold text-foreground truncate mt-0.5"
          title={companyName}
        >
          {companyName}
        </p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-sidebar-accent-foreground" : "text-muted-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/more"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
            onSecondary
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <MoreHorizontal
            className={cn(
              "h-4 w-4 shrink-0",
              onSecondary
                ? "text-sidebar-accent-foreground"
                : "text-muted-foreground",
            )}
          />
          More
        </Link>
      </nav>
    </aside>
  );
}
