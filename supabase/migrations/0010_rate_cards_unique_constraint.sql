-- 0010_rate_cards_unique_constraint.sql
--
-- Migration 0007 replaced the 4-tuple unique constraint on rate_cards
-- with a unique INDEX on (company_id, client_id, car_type, mode,
-- coalesce(plan_name, '')) — i.e. an expression index. Postgres
-- requires ON CONFLICT (cols) to match a constraint or index whose
-- column list is exactly those plain columns, so any upsert using
-- on_conflict("company_id,client_id,car_type,mode,plan_name") raises
-- "no unique or exclusion constraint matching the ON CONFLICT
-- specification".
--
-- Replaces the expression index with a real UNIQUE NULLS NOT DISTINCT
-- constraint over the five plain columns. NULLS NOT DISTINCT (PG 15+)
-- treats two NULL plan_names as equal, so Local / Outstation rows
-- (plan_name = NULL) still dedupe by (company, client, car, mode) the
-- way the COALESCE trick used to.

alter table public.rate_cards
  drop constraint if exists rate_cards_client_car_mode_plan_key;

drop index if exists public.rate_cards_natural_key;

alter table public.rate_cards
  add constraint rate_cards_client_car_mode_plan_key
  unique nulls not distinct
  (company_id, client_id, car_type, mode, plan_name);
