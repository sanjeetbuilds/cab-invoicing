"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_PRIMARY } from "./nav-items";

const MOBILE_PRIMARY_HREFS = new Set(MOBILE_PRIMARY.map((n) => n.href));

export function BottomNav() {
  const pathname = usePathname();
  const onSecondary = !MOBILE_PRIMARY_HREFS.has(pathname);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <ul className="grid grid-cols-5 h-14">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="flex">
          <Link
            href="/more"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
              onSecondary || pathname.startsWith("/more")
                ? "text-foreground"
                : "text-muted-foreground",
            )}
            aria-label="More"
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </Link>
        </li>
      </ul>
    </nav>
  );
}
