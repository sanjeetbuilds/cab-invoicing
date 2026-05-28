-- =============================================================================
-- Settings & trip form polish:
--   • Second phone number + invoice-only email on the company row.
--   • Trip night charges as a count of nights, not a boolean.
-- =============================================================================

alter table public.companies
  add column if not exists phone2 text,
  add column if not exists invoice_email text;

alter table public.trips
  add column if not exists night_count int not null default 0;

-- Backfill: every existing trip with night = true counts as 1 night.
update public.trips
   set night_count = 1
 where night = true
   and night_count = 0;
