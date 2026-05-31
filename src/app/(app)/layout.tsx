import { requireMembership } from "@/lib/auth";
import { Sidebar } from "@/components/shell/sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { TopBar } from "@/components/shell/top-bar";
import { PwaInstaller } from "@/components/shell/pwa-installer";
import { AppShellProvider } from "@/components/shell/app-shell-context";
import { TourLauncher } from "@/components/shell/tour-launcher";
import type { BrandMode, Company } from "@/lib/supabase/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, membership } = await requireMembership();

  const { data: company } = await supabase
    .from("companies")
    .select("name, brand_mode, logo_url, logo_aspect_ratio")
    .eq("id", membership.company_id)
    .single<
      Pick<Company, "name" | "brand_mode" | "logo_url" | "logo_aspect_ratio">
    >();

  const companyName = company?.name ?? "—";
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
        />
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar
            companyName={companyName}
            brandMode={brandMode}
            logoUrl={logoUrl}
            logoAspectRatio={logoAspectRatio}
            email={user.email ?? ""}
          />
          <main
            className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-8 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8"
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
