import Link from "next/link";

/**
 * Marketing surface, no sidebar, no bottom nav, no auth wrapping. The
 * thin top bar shows just the wordmark and a Sign in link. The wider
 * page padding gives the landing room to breathe.
 *
 * This layout wraps "/", "/privacy", "/terms", "/contact". Anything
 * inside (app)/* is a separate layout that adds the authenticated
 * shell.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-0 flex-col bg-background">
      <header
        className="sticky top-0 z-30 border-b border-transparent bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto max-w-6xl flex h-14 sm:h-16 items-center justify-between px-4 sm:px-8">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            EasyBills
          </Link>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            Sign in
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
