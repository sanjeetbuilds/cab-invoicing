import { requireMembership } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/ui/page-header";
import type { Company, Membership, Role } from "@/lib/supabase/types";
import { SettingsTabs } from "./settings-tabs";

export const metadata = { title: "Settings" };

export interface TeamMemberRow {
  id: string;
  role: Role;
  user_id: string | null;
  invited_email: string | null;
  accepted_at: string | null;
  email: string | null;
  is_self: boolean;
}

export default async function SettingsPage() {
  const { user, membership } = await requireMembership();
  const admin = createAdminClient();

  const [{ data: company }, { data: rows }] = await Promise.all([
    admin
      .from("companies")
      .select("*")
      .eq("id", membership.company_id)
      .maybeSingle<Company>(),
    admin
      .from("memberships")
      .select("id, role, user_id, invited_email, accepted_at")
      .eq("company_id", membership.company_id)
      .order("created_at", { ascending: true })
      .returns<
        Pick<Membership, "id" | "role" | "user_id" | "invited_email" | "accepted_at">[]
      >(),
  ]);

  const memberRows: TeamMemberRow[] = [];
  for (const r of rows ?? []) {
    let email: string | null = r.invited_email;
    if (r.user_id) {
      const { data } = await admin.auth.admin.getUserById(r.user_id);
      email = data.user?.email ?? r.invited_email ?? null;
    }
    memberRows.push({
      id: r.id,
      role: r.role,
      user_id: r.user_id,
      invited_email: r.invited_email,
      accepted_at: r.accepted_at,
      email,
      is_self: r.user_id === user.id,
    });
  }

  if (!company) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Settings" />
        <p className="text-sm text-destructive">Company record not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Company info, branding, numbering, terms, and team."
      />
      <SettingsTabs
        company={company}
        currentRole={membership.role}
        members={memberRows}
      />
    </div>
  );
}
