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
  return (
    <header className="sticky top-0 z-30 flex h-11 sm:h-12 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <p
        className="lg:hidden text-sm font-medium text-foreground truncate max-w-[200px]"
        title={companyName}
      >
        {companyName}
      </p>
      <div className="ml-auto">
        <UserMenu email={email} />
      </div>
    </header>
  );
}
