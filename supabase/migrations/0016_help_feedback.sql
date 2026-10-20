-- =============================================================================
-- Help center feedback: "Was this helpful?" on every guide and FAQ.
--
-- Platform-level, not per-company — a super-admin needs to see this
-- aggregated across every company, so it can't live behind the normal
-- company_id RLS model. Same pattern as admin_audit_log / super_admins:
-- RLS enabled with ZERO policies, reachable only through the service-role
-- client (src/app/help/actions.ts for writes, /admin/help-feedback for
-- reads). Anyone can submit feedback, including signed-out visitors
-- reading public help pages, so user_id/company_id are nullable.
-- =============================================================================

create table public.help_feedback (
  id          uuid primary key default gen_random_uuid(),
  item_type   text not null check (item_type in ('guide', 'faq')),
  item_slug   text not null,
  helpful     boolean not null,
  comment     text,
  user_id     uuid references auth.users(id) on delete set null,
  company_id  uuid references public.companies(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index help_feedback_item_idx on public.help_feedback (item_type, item_slug);

alter table public.help_feedback enable row level security;
-- Deliberately no policies: service-role only.
