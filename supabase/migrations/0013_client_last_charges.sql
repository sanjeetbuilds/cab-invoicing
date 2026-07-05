-- =============================================================================
-- Remember the last reimbursement charges (toll / tax / parking) entered for
-- each client at invoice-build time.
--
-- Charges are typed on the build screen and, until now, lived only on the
-- issued invoice row (toll_total / toll_label). Undoing and deleting an
-- invoice therefore erased them, so rebuilding the same trips started from a
-- blank charges box and the operator had to re-enter the amount by hand.
--
-- These columns give the charges a durable home on the client. Each time an
-- invoice is issued or saved as a draft for the client, we record the exact
-- amount and the ticked labels here; the build screen seeds its charges box
-- from them next time (a rebuild after delete, or simply the next month's
-- invoice), still fully editable before issuing.
-- =============================================================================
alter table public.clients
  add column if not exists last_charge_amount   numeric not null default 0,
  add column if not exists last_charge_toll     boolean not null default false,
  add column if not exists last_charge_tax      boolean not null default false,
  add column if not exists last_charge_parking  boolean not null default false;
