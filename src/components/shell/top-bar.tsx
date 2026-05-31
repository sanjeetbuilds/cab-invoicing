import { UserMenu } from "./user-menu";
import { BrandDisplay } from "./brand-display";
import type { BrandMode } from "@/lib/supabase/types";

export function TopBar({
  companyName,
  brandMode,
  logoUrl,
  logoAspectRatio,
  email,
}: {
  companyName: string;
  brandMode: BrandMode;
  logoUrl: string | null;
  logoAspectRatio: number | null;
  email: string;
}) {
  // Mobile: thin strip, brand block on the left (mode-aware), user
  // menu on the right. Desktop: the sidebar already shows the brand, so
  // the top bar collapses to just the user menu on the right.
  // `pt-[env(safe-area-inset-top)]` clears the notch on iOS; the visible
  // h-11/sm:h-12 strip sits below that.
  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-11 sm:h-12 items-center gap-3">
        <div className="lg:hidden min-w-0 max-w-[60%]">
          <BrandDisplay
            mode={brandMode}
            name={companyName}
            logoUrl={logoUrl}
            aspectRatio={logoAspectRatio}
            size="topbar-mobile"
          />
        </div>
        <div className="ml-auto">
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
