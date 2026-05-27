-- =============================================================================
-- Fix: RLS recursion on the memberships table
--
-- Why: The original SELECT policy on `memberships` referenced `memberships`
-- inside its subquery (to find companies the user belongs to). Postgres treats
-- this as recursive RLS evaluation and aborts with SQLSTATE 42P17
-- ("infinite recursion detected in policy for relation memberships").
--
-- Fix:
--   1. memberships SELECT policy: simplify to `user_id = auth.uid()`. Users
--      only see their own membership rows; that's enough for everything in
--      Milestones 2–6. Cross-company member listing for the Team tab will be
--      added in Milestone 7 via a SECURITY DEFINER view that bypasses RLS.
--   2. INSERT/UPDATE/DELETE policies: use a SECURITY DEFINER helper function
--      (user_has_role) that bypasses RLS internally — no recursion.
-- =============================================================================

-- Helper: does the current user hold one of the given roles in the given company?
-- SECURITY DEFINER bypasses RLS on `memberships` inside the function body.
create or replace function public.user_has_role(
  p_company_id uuid,
  p_roles      text[]
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1
      from public.memberships
     where company_id = p_company_id
       and user_id    = auth.uid()
       and role       = any(p_roles)
  );
$$;

grant execute on function public.user_has_role(uuid, text[]) to authenticated;

-- Drop the recursive policies
drop policy if exists "members can read memberships of their companies"   on public.memberships;
drop policy if exists "users can insert own membership or owners can invite" on public.memberships;
drop policy if exists "owners and admins can update memberships"          on public.memberships;
drop policy if exists "owners and admins can remove memberships"          on public.memberships;

-- Non-recursive replacements
create policy "users see own memberships"
  on public.memberships for select
  using (user_id = auth.uid());

create policy "users insert own membership or admins invite"
  on public.memberships for insert
  with check (
    user_id = auth.uid()
    or public.user_has_role(company_id, array['owner','admin'])
  );

create policy "admins update memberships"
  on public.memberships for update
  using (public.user_has_role(company_id, array['owner','admin']));

create policy "admins delete memberships"
  on public.memberships for delete
  using (public.user_has_role(company_id, array['owner','admin']));
