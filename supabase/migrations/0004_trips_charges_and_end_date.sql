-- =============================================================================
-- Milestone 5+: multi-day outstation duties + Toll/Tax/Parking charge model
-- =============================================================================

-- Optional end date for a single trip that spans multiple days.
-- When null, the trip is a single-day duty (existing behaviour).
alter table public.trips
  add column if not exists end_date date;

-- Replace the single-purpose `toll` numeric with a combined amount + three
-- independent flags for what the amount covers. Old `toll` column is left
-- in place for backward compatibility; new flows write to the new columns.
alter table public.trips
  add column if not exists extra_charge_amount numeric not null default 0,
  add column if not exists charge_toll         boolean not null default false,
  add column if not exists charge_tax          boolean not null default false,
  add column if not exists charge_parking      boolean not null default false;

-- One-time backfill: any existing rows with a non-zero `toll` should carry
-- that amount forward, ticked as "Toll" (the implicit prior meaning).
update public.trips
   set extra_charge_amount = coalesce(toll, 0),
       charge_toll = true
 where coalesce(toll, 0) > 0
   and extra_charge_amount = 0
   and charge_toll = false;

-- Issued invoices snapshot the user-visible label for the charges line so
-- the rendered PDF stays stable even if categories are renamed later.
alter table public.invoices
  add column if not exists toll_label text;

-- Backfill existing invoices (if any) with the historic label.
update public.invoices
   set toll_label = 'Toll & Parking'
 where toll_label is null;
