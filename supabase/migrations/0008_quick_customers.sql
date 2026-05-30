-- 0008_quick_customers.sql
--
-- Walk-in / retail customers who need a tax invoice on the spot but
-- aren't regular clients. Marked with is_quick_customer so the regular
-- /clients listing can filter them out (or surface them separately).
alter table public.clients
  add column if not exists is_quick_customer boolean not null default false;

create index if not exists clients_is_quick_customer_idx
  on public.clients (company_id, is_quick_customer);
