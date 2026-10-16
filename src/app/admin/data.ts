import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { countAdminSetupSteps, ADMIN_SETUP_STEPS_TOTAL } from "@/lib/admin-setup-progress";
import { isTempPasswordExpired } from "@/lib/temp-password-state";
import type { Company, CompanyStatus, Role } from "@/lib/supabase/types";

export interface AdminCompanyRow {
  id: string;
  name: string;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  status: CompanyStatus;
  /** Only meaningful when status === "invited" — has the 7-day temporary
   *  password window run out without a first login. */
  isPasswordExpired: boolean;
  selfSignup: boolean;
  setupDone: number;
  setupTotal: number;
}

async function ownerLookup(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
): Promise<{
  userId: string | null;
  name: string | null;
  email: string | null;
  lastActiveAt: string | null;
  isPasswordExpired: boolean;
}> {
  const { data: membership } = await admin
    .from("memberships")
    .select("user_id, invited_email, member_name")
    .eq("company_id", companyId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ user_id: string | null; invited_email: string | null; member_name: string | null }>();

  if (!membership) {
    return { userId: null, name: null, email: null, lastActiveAt: null, isPasswordExpired: false };
  }

  let email = membership.invited_email;
  let lastActiveAt: string | null = null;
  let isPasswordExpired = false;
  if (membership.user_id) {
    const { data } = await admin.auth.admin.getUserById(membership.user_id);
    email = data.user?.email ?? email;
    lastActiveAt = data.user?.last_sign_in_at ?? null;
    const meta = (data.user?.user_metadata ?? {}) as {
      must_change_password?: boolean;
      temp_password_set_at?: string;
    };
    isPasswordExpired = Boolean(meta.must_change_password) && isTempPasswordExpired(meta.temp_password_set_at);
  }

  return { userId: membership.user_id, name: membership.member_name, email, lastActiveAt, isPasswordExpired };
}

export async function loadCompanyRows(
  admin: ReturnType<typeof createAdminClient>,
): Promise<AdminCompanyRow[]> {
  const { data: companies } = await admin
    .from("companies")
    .select("id, name, status, created_via, created_at, state")
    .order("created_at", { ascending: false })
    .returns<Pick<Company, "id" | "name" | "status" | "created_via" | "created_at" | "state">[]>();

  return Promise.all(
    (companies ?? []).map(async (c): Promise<AdminCompanyRow> => {
      const owner = await ownerLookup(admin, c.id);
      const setupDone = await countAdminSetupSteps(admin, c.id, c.state);

      return {
        id: c.id,
        name: c.name,
        ownerUserId: owner.userId,
        ownerName: owner.name,
        ownerEmail: owner.email,
        createdAt: c.created_at,
        lastActiveAt: owner.lastActiveAt,
        status: c.status,
        isPasswordExpired: owner.isPasswordExpired,
        selfSignup: c.created_via === "self_signup",
        setupDone,
        setupTotal: ADMIN_SETUP_STEPS_TOTAL,
      };
    }),
  );
}

export interface AdminMemberRow {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  lastActiveAt: string | null;
}

export interface AdminCompanyDetail {
  id: string;
  name: string;
  state: string;
  status: CompanyStatus;
  isPasswordExpired: boolean;
  createdAt: string;
  createdVia: "admin" | "self_signup";
  internalNote: string | null;
  members: AdminMemberRow[];
}

export async function loadCompanyDetail(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
): Promise<AdminCompanyDetail | null> {
  const { data: company } = await admin
    .from("companies")
    .select("id, name, state, status, created_at, created_via, internal_note")
    .eq("id", companyId)
    .maybeSingle<
      Pick<Company, "id" | "name" | "state" | "status" | "created_at" | "created_via"> & {
        internal_note: string | null;
      }
    >();
  if (!company) return null;

  const { data: memberships } = await admin
    .from("memberships")
    .select("id, user_id, invited_email, member_name, role")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true })
    .returns<
      { id: string; user_id: string | null; invited_email: string | null; member_name: string | null; role: Role }[]
    >();

  const members: AdminMemberRow[] = [];
  let isPasswordExpired = false;
  for (const m of memberships ?? []) {
    let email = m.invited_email;
    let lastActiveAt: string | null = null;
    if (m.user_id) {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      email = data.user?.email ?? email;
      lastActiveAt = data.user?.last_sign_in_at ?? null;
      if (m.role === "owner") {
        const meta = (data.user?.user_metadata ?? {}) as {
          must_change_password?: boolean;
          temp_password_set_at?: string;
        };
        isPasswordExpired = Boolean(meta.must_change_password) && isTempPasswordExpired(meta.temp_password_set_at);
      }
    }
    members.push({ id: m.id, name: m.member_name, email, role: m.role, lastActiveAt });
  }

  return {
    id: company.id,
    name: company.name,
    state: company.state,
    status: company.status,
    isPasswordExpired,
    createdAt: company.created_at,
    createdVia: company.created_via,
    internalNote: company.internal_note,
    members,
  };
}
