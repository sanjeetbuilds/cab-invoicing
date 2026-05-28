import { requireMembership } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { Membership, Role } from "@/lib/supabase/types";
import { TeamSection } from "./team-section";

export const metadata = { title: "Settings — Krishna Cabs" };

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

  const { data: rows } = await admin
    .from("memberships")
    .select("id, role, user_id, invited_email, accepted_at")
    .eq("company_id", membership.company_id)
    .order("created_at", { ascending: true })
    .returns<
      Pick<
        Membership,
        "id" | "role" | "user_id" | "invited_email" | "accepted_at"
      >[]
    >();

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your team. Company info, numbering, and invoice terms come next."
      />

      <Card>
        <TeamSection currentRole={membership.role} members={memberRows} />
      </Card>

      <Card>
        <CardContent className="text-sm text-muted-foreground">
          Company info, invoice numbering, and terms editing are not in this
          page yet — set them directly in Supabase Studio under{" "}
          <code className="font-mono text-foreground">companies</code> for
          now.
        </CardContent>
      </Card>
    </div>
  );
}
