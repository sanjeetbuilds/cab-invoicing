"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_PRIMARY } from "./nav-items";
import { useSaveBarMounted } from "./app-shell-context";

const MOBILE_PRIMARY_HREFS = new Set(MOBILE_PRIMARY.map((n) => n.href));

export function BottomNav() {
  const pathname = usePathname();
  const onSecondary = !MOBILE_PRIMARY_HREFS.has(pathname);
  const saveBarMounted = useSaveBarMounted();

  // Hide whenever a form's Save bar is on screen so the two footers
  // never compete for the same row (Rule 4 collision rule).
  if (saveBarMounted) return null;

  return (
    // `pb-[env(safe-area-inset-bottom)]` lifts the 56px tab row above
    // the iPhone home indicator so the tabs stay tappable on devices
    // with on-screen gesture bars.
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* 4 primary destinations + the More tab = 5 columns in a single
          row. h-16 (64px) gives thumb-friendly tap targets. */}
      <ul className="grid grid-cols-5 h-16">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          // data-tour anchor: matches sidebar tagging so the first-run
          // tour can point at the right bottom-tab on mobile.
          const tourKey = item.href.startsWith("/clients")
            ? "nav-clients"
            : item.href.startsWith("/invoices")
              ? "nav-invoices"
              : undefined;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                data-tour={tourKey}
                className="flex flex-1 flex-col items-center justify-center"
              >
                <span
                  className={cn(
                    "inline-flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] transition-colors duration-150",
                    active
                      ? "bg-[rgba(79,70,229,0.10)] text-[#4f46e5] font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex">
          <Link
            href="/more"
            data-tour="nav-bulk-import"
            className="flex flex-1 flex-col items-center justify-center"
            aria-label="More"
          >
            <span
              className={cn(
                "inline-flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[11px] transition-colors duration-150",
                onSecondary || pathname.startsWith("/more")
                  ? "bg-[rgba(79,70,229,0.10)] text-[#4f46e5] font-medium"
                  : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              More
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
