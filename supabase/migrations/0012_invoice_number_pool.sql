-- =============================================================================
-- Reusable invoice number pool.
--
-- A company keeps a pool of freed invoice numbers. Deleting a draft or an
-- undone (reversed) invoice frees its number into the pool. New invoices take
-- the lowest freed number first, then fall back to the next sequential number.
-- A number is in use by at most one invoice (enforced by the existing
-- unique (company_id, invoice_number) on invoices) or sits free in the pool.
--
-- This supersedes the draft-only LIFO scheme from migration 0011.
-- =============================================================================

create table if not exists public.invoice_number_pool (
  company_id uuid not null references public.companies(id) on delete cascade,
  number     int  not null,
  freed_at   timestamptz not null default now(),
  primary key (company_id, number)
);

-- All access goes through the SECURITY DEFINER functions below, which check
-- membership themselves. Enable RLS with no policies so nothing can touch the
-- pool directly through PostgREST.
alter table public.invoice_number_pool enable row level security;

-- The 0011 draft-delete helper is replaced by delete_invoice_and_free_number.
drop function if exists public.delete_draft_invoice(uuid, uuid);

-- ── Allocate a number ────────────────────────────────────────────────────────
-- p_requested null  : auto, lowest freed number, else next sequential.
-- p_requested set   : must be a freed number in the pool, or exactly the next
--                     sequential number. Anything else (in use or out of range)
--                     raises, so two invoices can never hold the same number.
-- Replaces the old single-argument function.
drop function if exists public.allocate_invoice_number(uuid);

create or replace function public.allocate_invoice_number(
  p_company_id uuid,
  p_requested  int default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next  int;
  v_taken int;
begin
  if not exists (
    select 1 from public.memberships
    where company_id = p_company_id
      and user_id = auth.uid()
      and role in ('owner','admin','staff')
  ) then
    raise exception 'not authorized to allocate invoice number for company %', p_company_id;
  end if;

  -- Lock the counter row so allocation and pool changes cannot race.
  select next_invoice_number into v_next
    from public.companies where id = p_company_id for update;
  if v_next is null then
    raise exception 'company % not found', p_company_id;
  end if;

  if p_requested is not null then
    delete from public.invoice_number_pool
     where company_id = p_company_id and number = p_requested
    returning number into v_taken;
    if v_taken is not null then
      return v_taken; -- reused a freed number
    end if;
    if p_requested = v_next then
      update public.companies
         set next_invoice_number = v_next + 1, updated_at = now()
       where id = p_company_id;
      return v_next;
    end if;
    raise exception 'invoice number % is not available', p_requested;
  end if;

  -- Auto: lowest freed number first.
  delete from public.invoice_number_pool
   where company_id = p_company_id
     and number = (
       select min(number) from public.invoice_number_pool
       where company_id = p_company_id
     )
  returning number into v_taken;
  if v_taken is not null then
    return v_taken;
  end if;

  -- Pool empty: next sequential number.
  update public.companies
     set next_invoice_number = v_next + 1, updated_at = now()
   where id = p_company_id;
  return v_next;
end;
$$;

-- ── Delete a draft or undone invoice and free its number ─────────────────────
create or replace function public.delete_invoice_and_free_number(
  p_company_id uuid,
  p_invoice_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status  text;
  v_number  int;
  v_company uuid;
begin
  if not exists (
    select 1 from public.memberships
    where company_id = p_company_id
      and user_id = auth.uid()
      and role in ('owner','admin','staff')
  ) then
    raise exception 'not authorized to delete invoice for company %', p_company_id;
  end if;

  perform 1 from public.companies where id = p_company_id for update;

  select status, invoice_number, company_id
    into v_status, v_number, v_company
    from public.invoices where id = p_invoice_id;

  if v_number is null then
    raise exception 'invoice % not found', p_invoice_id;
  end if;
  if v_company <> p_company_id then
    raise exception 'invoice % does not belong to company %', p_invoice_id, p_company_id;
  end if;
  if v_status not in ('draft','reversed') then
    raise exception 'only draft or undone invoices can be deleted (invoice % is %)', p_invoice_id, v_status;
  end if;

  -- Free any trips still linked (drafts hold them; an undone invoice already
  -- released its trips, so this is a no-op there).
  update public.trips
     set invoiced = false, invoice_id = null
   where invoice_id = p_invoice_id and company_id = p_company_id;

  -- Delete the invoice (invoice_lines cascade on the foreign key).
  delete from public.invoices where id = p_invoice_id;

  -- Return the number to the reuse pool.
  insert into public.invoice_number_pool (company_id, number)
  values (p_company_id, v_number)
  on conflict (company_id, number) do nothing;

  return v_number;
end;
$$;

-- ── Read the freed numbers (for the build screen picker) ──────────────────────
create or replace function public.get_freed_invoice_numbers(p_company_id uuid)
returns int[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v int[];
begin
  if not exists (
    select 1 from public.memberships
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;
  select coalesce(array_agg(number order by number), '{}')
    into v
    from public.invoice_number_pool
   where company_id = p_company_id;
  return v;
end;
$$;
