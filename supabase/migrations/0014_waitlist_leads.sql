-- =============================================================================
-- Waitlist leads from the public landing page's "Join the waitlist" form.
-- Written only through the server action (service-role client), so RLS is
-- enabled with zero policies — nobody can read or write this table via the
-- client SDK, including the public anon key the landing page ships with.
-- =============================================================================

create table public.waitlist_leads (
  id          uuid primary key default gen_random_uuid(),
  company     text not null,
  email       text not null,
  phone       text not null,
  source      text,
  created_at  timestamptz not null default now()
);

create index waitlist_leads_created_at_idx on public.waitlist_leads (created_at desc);

alter table public.waitlist_leads enable row level security;
