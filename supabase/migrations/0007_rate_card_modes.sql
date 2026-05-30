-- 0007_rate_card_modes.sql
--
-- Add Transfer + Package modes (fixed-price billing) alongside the
-- existing Local + Outstation. Same client + car can now have multiple
-- Transfer plans (Airport T3 / NDLS / OD station) and Package plans
-- (Manali 3D2N / Shimla Weekend) — so the natural key on rate_cards
-- gains plan_name. Trips and quotation lines pick up the same shape.

-- ---------- rate_cards ----------

-- Old natural-key constraint (3-tuple) drops; we re-create as a unique
-- index that includes plan_name via COALESCE so existing local /
-- outstation rows (plan_name NULL) keep a single row per (client, car).
alter table public.rate_cards
  drop constraint if exists rate_cards_company_id_client_id_car_type_mode_key;

alter table public.rate_cards
  drop constraint if exists rate_cards_mode_check;

alter table public.rate_cards
  add column if not exists plan_name        text,
  add column if not exists fixed_price      numeric,
  add column if not exists includes_toll    boolean not null default false,
  add column if not exists includes_tax     boolean not null default false,
  add column if not exists includes_parking boolean not null default false,
  add column if not exists notes            text;

alter table public.rate_cards
  add constraint rate_cards_mode_check
  check (mode in ('local', 'outstation', 'transfer', 'package'));

create unique index if not exists rate_cards_natural_key
  on public.rate_cards (company_id, client_id, car_type, mode, coalesce(plan_name, ''));

-- ---------- trips ----------

alter table public.trips
  drop constraint if exists trips_mode_check;

alter table public.trips
  add constraint trips_mode_check
  check (mode in ('local', 'outstation', 'transfer', 'package'));

alter table public.trips
  add column if not exists plan_name text;

-- ---------- quotation_lines ----------

alter table public.quotation_lines
  drop constraint if exists quotation_lines_mode_check;

alter table public.quotation_lines
  add constraint quotation_lines_mode_check
  check (mode in ('local', 'outstation', 'transfer', 'package'));

alter table public.quotation_lines
  add column if not exists plan_name        text,
  add column if not exists fixed_price      numeric,
  add column if not exists includes_toll    boolean not null default false,
  add column if not exists includes_tax     boolean not null default false,
  add column if not exists includes_parking boolean not null default false,
  add column if not exists notes            text;
