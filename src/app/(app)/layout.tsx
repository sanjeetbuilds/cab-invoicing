import { requireMembership, isSuperAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/shell/sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { TopBar } from "@/components/shell/top-bar";
import { PwaInstaller } from "@/components/shell/pwa-installer";
import { AppShellProvider } from "@/components/shell/app-shell-context";
import { TourLauncher } from "@/components/shell/tour-launcher";
import { Card, CardContent } from "@/components/ui/card";
import { SUPPORT_CONTACT, supportWhatsAppLink } from "@/lib/platform-config";
import { CompanySwitcher, type SwitcherCompany } from "@/components/shell/company-switcher";
import type { BrandMode, Company } from "@/lib/supabase/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, membership, memberships } = await requireMembership();
  const superAdmin = await isSuperAdmin();

  const companyIds = memberships.map((m) => m.company_id);
  const [{ data: company }, { data: allCompanies }] = await Promise.all([
    supabase
      .from("companies")
      .select("name, brand_mode, logo_url, logo_aspect_ratio, status")
      .eq("id", membership.company_id)
      .single<
        Pick<Company, "name" | "brand_mode" | "logo_url" | "logo_aspect_ratio" | "status">
      >(),
    supabase
      .from("companies")
      .select("id, name, status")
      .in("id", companyIds)
      .returns<Pick<Company, "id" | "name" | "status">[]>(),
  ]);

  const switcherCompanies: SwitcherCompany[] = (allCompanies ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    suspended: c.status === "suspended",
  }));

  // Suspended companies keep their data (never deleted) but every page is
  // replaced with this notice, regardless of role, for as long as this is
  // the company currently selected. A user with other companies can still
  // switch to one of those from here; a user with only this one company
  // can only sign out and wait.
  if (company?.status === "suspended") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-base font-medium text-foreground">Account paused</p>
            <p className="text-sm text-muted-foreground">
              Access to {company.name} is paused. Contact us to restore it.
            </p>
            <a
              href={supportWhatsAppLink(`Hi, access to ${company.name} on Cab Invoicing is paused.`)}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary hover:text-primary-hover underline"
            >
              Contact us ({SUPPORT_CONTACT})
            </a>
            <form action="/sign-out" method="POST">
              <button
                type="submit"
                className="text-sm font-medium text-muted-foreground hover:text-foreground underline"
              >
                Sign out
              </button>
            </form>
          </CardContent>
        </Card>
        {switcherCompanies.length > 1 && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">Or switch to another company:</p>
            {/* Reuses the same switcher as the normal top bar, so picking
                a non-suspended company here drops them straight into it. */}
            <CompanySwitcher companies={switcherCompanies} currentId={membership.company_id} />
          </div>
        )}
      </div>
    );
  }

  const companyName = company?.name ?? "-";
  const brandMode: BrandMode = company?.brand_mode ?? "text_only";
  const logoUrl = company?.logo_url ?? null;
  const logoAspectRatio = company?.logo_aspect_ratio ?? null;

  return (
    // h-dvh + dvh units track the dynamic viewport so the layout
    // doesn't jump when mobile browser chrome collapses. Sidebar
    // and top-bar stay put; only <main> scrolls.
    <AppShellProvider>
      <div className="h-dvh flex overflow-hidden">
        <Sidebar
          companyName={companyName}
          brandMode={brandMode}
          logoUrl={logoUrl}
          logoAspectRatio={logoAspectRatio}
          isSuperAdmin={superAdmin}
        />
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar
            companyName={companyName}
            brandMode={brandMode}
            logoUrl={logoUrl}
            logoAspectRatio={logoAspectRatio}
            email={user.email ?? ""}
            companies={switcherCompanies}
            currentCompanyId={membership.company_id}
          />
          <main
            // Reserves enough room at the bottom to clear either the
            // mobile BottomNav (h-16 + safe-area) or the desktop /
            // mobile SaveBar (~h-14 + safe-area). The two never show
            // at the same time, so one fixed reserve covers both.
            className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-8 pb-[calc(6rem+env(safe-area-inset-bottom))]"
          >
            {children}
          </main>
        </div>
        <BottomNav />
        <PwaInstaller />
        <TourLauncher />
      </div>
    </AppShellProvider>
  );
}
