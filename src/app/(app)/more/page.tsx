import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { NAV_ITEMS } from "@/components/shell/nav-items";

export const metadata = { title: "More" };

const PRIMARY_HREFS = new Set(
  NAV_ITEMS.filter((n) => n.mobile).map((n) => n.href),
);

export default async function MorePage() {
  const { user } = await requireMembership();
  // Show every nav item that isn't already on the bottom bar.
  const items = NAV_ITEMS.filter((n) => !PRIMARY_HREFS.has(n.href));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="More" description="Other tools and settings." />

      <Card>
        <CardContent className="-mx-4 -my-4 sm:-mx-6 sm:-my-6 px-0 py-0">
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted transition-colors"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/sign-out"
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted transition-colors"
              >
                <LogOut className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">Sign out</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        Signed in as {user.email ?? "—"}
      </p>
    </div>
  );
}
