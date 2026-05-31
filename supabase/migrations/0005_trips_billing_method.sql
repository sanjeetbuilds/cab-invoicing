-- =============================================================================
-- Outstation trips can opt into "slab" billing (base + additional kms + hrs +
-- night) by borrowing the LOCAL rate card for the same client + car_type.
-- Local trips are always slab, the field is ignored for them.
-- =============================================================================

alter table public.trips
  add column if not exists billing_method text not null default 'per_km'
    check (billing_method in ('per_km','slab'));

-- Backfill: every existing local-mode trip is implicitly slab. Outstation
-- trips that exist today were billed per_km; the default already covers them.
update public.trips
   set billing_method = 'slab'
 where mode = 'local'
   and billing_method <> 'slab';
