import { Menu } from "lucide-react";
import { UserMenu } from "./user-menu";

export function TopBar({
  companyName,
  email,
}: {
  companyName: string;
  email: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <button
        type="button"
        aria-label="Open menu"
        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="lg:hidden">
        <p className="text-xs uppercase tracking-wide text-muted-foreground leading-tight">
          Company
        </p>
        <p className="text-sm font-semibold truncate max-w-[180px]" title={companyName}>
          {companyName}
        </p>
      </div>
      <div className="ml-auto">
        <UserMenu email={email} />
      </div>
    </header>
  );
}
