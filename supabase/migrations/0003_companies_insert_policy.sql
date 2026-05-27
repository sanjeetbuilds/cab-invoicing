-- =============================================================================
-- Fix: companies INSERT policy
--
-- The original policy ("auth.uid() is not null") relied on auth.uid() being
-- non-null inside the WITH CHECK expression. In some @supabase/ssr Server
-- Action paths this evaluates to NULL even when the request is authenticated,
-- so the insert is rejected with "new row violates row-level security policy".
--
-- Idiomatic Supabase fix: scope the policy TO authenticated. Postgres switches
-- the DB role to `authenticated` whenever the request carries a valid JWT, so
-- the role check is decoupled from auth.uid() evaluation.
-- =============================================================================

drop policy if exists "authenticated users can create a company" on public.companies;

create policy "authenticated users can create a company"
  on public.companies
  for insert
  to authenticated
  with check (true);
