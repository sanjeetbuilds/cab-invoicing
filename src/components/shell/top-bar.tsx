import { UserMenu } from "./user-menu";

export function TopBar({
  companyName,
  email,
}: {
  companyName: string;
  email: string;
}) {
  // Mobile: thin strip — just the company name (the bottom nav covers
  // navigation, so the hamburger here was redundant). Desktop: sidebar
  // already shows the company, so the top bar collapses to just the
  // user menu on the right.
  // `pt-[env(safe-area-inset-top)]` clears the notch on iOS; the visible
  // h-11/sm:h-12 strip sits below that.
  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-11 sm:h-12 items-center gap-3">
        <p
          className="lg:hidden text-sm font-medium text-foreground truncate max-w-[200px]"
          title={companyName}
        >
          {companyName}
        </p>
        <div className="ml-auto">
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
