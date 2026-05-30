import { requireMembership } from "@/lib/auth";
import { Sidebar } from "@/components/shell/sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { TopBar } from "@/components/shell/top-bar";
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
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-7 pb-20 lg:pb-7">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
