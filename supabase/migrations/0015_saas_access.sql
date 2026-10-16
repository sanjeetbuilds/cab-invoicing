-- =============================================================================
-- Invite-only multi-company SaaS: company lifecycle, admin-issued temporary
-- passwords, platform admin, audit log.
--
-- companies gains:
--   status       invited | active | suspended — admin-controlled lifecycle.
--                'invited' here means "account created, temporary password
--                issued, first login not completed yet" (displayed as
--                "Password sent" / "Password expired" depending on age —
--                see src/lib/temp-password-state.ts for the 7-day check).
--                Every row that exists before this migration runs is a
--                self-serve signup, so it backfills to 'active' (the column
--                default), nothing changes for anyone already using the app.
--   created_via  admin | self_signup — a one-time label. Every row that
--                exists before this migration is self_signup by definition
--                (the admin panel doesn't exist yet); every row created
--                afterward goes through the admin panel and is tagged
--                'admin'. Backfilled below with a blanket UPDATE that is
--                only correct because it runs before any admin-created
--                company can exist.
--   internal_note  admin-only free text, never selected by company-facing
--                   pages (kept out of the shared Company TS type on
--                   purpose — the admin panel reads it with its own
--                   narrower column list).
--
-- There's no "invites" table. The admin panel (and team invites in
-- Settings) create the auth user and membership directly with a generated
-- temporary password — no link to click, no separate accept step. Whether
-- someone still needs to set their own password lives on the auth user's
-- own metadata (must_change_password / temp_password_set_at), not in a
-- project table, since it's a property of the login, not of any one
-- company — see src/lib/temp-password-state.ts.
--
-- `super_admins` is a bare allow-list, platform-level, entirely separate
-- from per-company roles in `memberships`. RLS enabled with ZERO policies:
-- reachable only through the service-role client on the server. Rows are
-- added by hand in the SQL editor, never through any screen.
--
-- `admin_audit_log` records who did what to which company from the admin
-- panel (created, temp password sent, owner email changed, suspended with
-- its required reason, reactivated, deleted), shown in "View details".
-- =============================================================================

alter table public.companies
  add column if not exists status text not null default 'active'
    check (status in ('invited', 'active', 'suspended')),
  add column if not exists created_via text not null default 'admin'
    check (created_via in ('admin', 'self_signup')),
  add column if not exists internal_note text;

-- Every company that exists right now predates the admin panel.
update public.companies set created_via = 'self_signup';

create table public.super_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- company_id is "on delete set null", not cascade: deleting a company
-- that never completed its first login (see deleteCompanyAction) should
-- still leave the record of "this company was created, then deleted"
-- behind. A company-name snapshot goes in metadata for exactly that case.
create table public.admin_audit_log (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid references public.companies(id) on delete set null,
  actor_user_id  uuid references auth.users(id) on delete set null,
  actor_email    text,
  action         text not null check (
    action in (
      'created', 'temp_password_sent', 'owner_email_changed',
      'suspended', 'reactivated', 'deleted'
    )
  ),
  reason         text,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

create index admin_audit_log_company_idx on public.admin_audit_log (company_id);

alter table public.super_admins     enable row level security;
alter table public.admin_audit_log  enable row level security;
-- Deliberately no policies on either: service-role only.

-- ---------- memberships: who a membership row was created for ----------
-- Lets the admin panel and team member lists show a name even before the
-- person has ever signed in, same idea as the pre-existing invited_email.
alter table public.memberships
  add column if not exists member_name text;

-- ---------- Close the self-service company/membership bypass ----------
-- Pre-existing policies let ANY signed-in user insert a companies row, or a
-- memberships row attaching themselves to ANY company_id with any role,
-- directly via the client SDK and the public anon key. The app's own code
-- never relied on these (it always writes through the service-role admin
-- client), so removing them changes no app behaviour — it only removes a
-- direct-REST-API bypass of invite-only signup.
drop policy if exists "authenticated users can create a company" on public.companies;
drop policy if exists "users can insert own membership or owners can invite" on public.memberships;

create policy "owners and admins can invite members"
  on public.memberships
  for insert
  to authenticated
  with check (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
