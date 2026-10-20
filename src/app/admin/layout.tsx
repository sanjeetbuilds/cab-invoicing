import type { ReactNode } from "react";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata = {
  title: {
    template: "%s · Platform admin",
    default: "Platform admin",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Gate the whole /admin tree here, independent of company membership —
  // a super-admin may belong to zero companies. Non-super-admins get a
  // plain 404 (thrown inside requireSuperAdmin), not a "no access" page.
  await requireSuperAdmin();

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border px-4 py-4 sm:px-6 flex items-center gap-6">
        <Link href="/admin" className="text-sm font-semibold text-foreground">
          Platform admin
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Companies
          </Link>
          <Link href="/admin/help-feedback" className="text-sm text-muted-foreground hover:text-foreground">
            Help feedback
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
