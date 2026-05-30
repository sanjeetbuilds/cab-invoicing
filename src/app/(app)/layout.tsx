import { requireMembership } from "@/lib/auth";
import { Sidebar } from "@/components/shell/sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { TopBar } from "@/components/shell/top-bar";
import { PwaInstaller } from "@/components/shell/pwa-installer";
import type { Company } from "@/lib/supabase/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, membership } = await requireMembership();

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", membership.company_id)
    .single<Pick<Company, "name">>();

  const companyName = company?.name ?? "—";

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar companyName={companyName} />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar companyName={companyName} email={user.email ?? ""} />
        {/* Mobile: bottom padding clears the fixed 56px nav PLUS the
            iPhone home-indicator inset so the last form / list row is
            never hidden under the gesture bar. lg+ has a sidebar (no
            bottom nav) so just a normal py-7 / pb-7. */}
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-7 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-7">
          {children}
        </main>
      </div>
      <BottomNav />
      <PwaInstaller />
    </div>
  );
}
