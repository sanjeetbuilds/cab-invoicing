-- =============================================================================
-- Krishna Cabs SaaS — initial schema
-- Multi-tenant: every business row carries company_id; RLS enforces isolation.
-- =============================================================================

-- gen_random_uuid() lives in pgcrypto (Supabase enables it by default, but make sure).
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helper: auto-update updated_at on row change
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- Tenancy
-- =============================================================================

create table public.companies (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  address               text,
  gstin                 text,
  phone                 text,
  email                 text,
  state                 text not null,
  invoice_prefix        text default '',
  next_invoice_number   int  not null default 1,
  quotation_prefix      text default 'Q-',
  next_quotation_number int  not null default 1,
  terms_invoice         text[] default '{}',
  terms_quotation       text[] default '{}',
  plan                  text not null default 'free' check (plan in ('free','pro')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create table public.memberships (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  role          text not null check (role in ('owner','admin','staff','viewer')),
  invited_email text,
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (company_id, user_id)
);

create index memberships_user_idx    on public.memberships (user_id);
create index memberships_company_idx on public.memberships (company_id);

-- =============================================================================
-- Business data
-- =============================================================================

create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  name               text not null,
  gstin              text,
  address            text,
  state              text not null,
  is_rcm             boolean not null default false,
  default_booked_by  text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index clients_company_name_idx on public.clients (company_id, name);

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create table public.vehicles (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  number      text not null,
  type        text not null check (type in ('Dzire','Sonet','Crysta','Innova','Ertiga','Other')),
  ownership   text not null check (ownership in ('own','attached')),
  vendor_name text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, number)
);

create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- Quotations come before rate_cards because rate_cards.source_quotation_id references quotations.
create table public.quotations (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  number          text not null,
  client_id       uuid references public.clients(id) on delete set null,
  client_name     text,
  client_address  text,
  client_gstin    text,
  client_contact  text,
  date            date not null,
  valid_until     date,
  status          text not null check (status in ('draft','sent','accepted','expired','rejected')),
  notes           text,
  source_pdf_url  text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  unique (company_id, number)
);

create index quotations_company_date_idx on public.quotations (company_id, date desc);

create trigger trg_quotations_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

create table public.quotation_lines (
  id            uuid primary key default gen_random_uuid(),
  quotation_id  uuid not null references public.quotations(id) on delete cascade,
  car_type      text not null,
  mode          text not null check (mode in ('local','outstation')),
  base_rate     numeric,
  base_kms      int,
  base_hours    int,
  extra_km      numeric,
  extra_hour    numeric,
  night         numeric,
  per_km        numeric,
  driver_ta     numeric,
  sort_order    int not null default 0
);

create index quotation_lines_quotation_idx on public.quotation_lines (quotation_id);

create table public.rate_cards (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  client_id            uuid not null references public.clients(id) on delete cascade,
  car_type             text not null,
  mode                 text not null check (mode in ('local','outstation')),
  -- local mode:
  base_rate            numeric,
  base_kms             int  default 80,
  base_hours           int  default 8,
  extra_km             numeric,
  extra_hour           numeric,
  night                numeric,
  -- outstation mode:
  per_km               numeric,
  -- common:
  driver_ta            numeric,
  source_quotation_id  uuid references public.quotations(id) on delete set null,
  active_from          date not null default current_date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (company_id, client_id, car_type, mode)
);

create trigger trg_rate_cards_updated_at
  before update on public.rate_cards
  for each row execute function public.set_updated_at();

-- Invoices before trips: trips.invoice_id references invoices.
create table public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  invoice_number      int  not null,
  invoice_date        date not null,
  client_id           uuid references public.clients(id) on delete set null,
  -- snapshot:
  client_name         text not null,
  client_address      text,
  client_gstin        text,
  client_booked_by    text,
  period_from         date,
  period_to           date,
  subtotal            numeric not null,
  gst_mode            text not null check (gst_mode in ('RCM','CGST_SGST','IGST')),
  cgst                numeric not null default 0,
  sgst                numeric not null default 0,
  igst                numeric not null default 0,
  toll_total          numeric not null default 0,
  net_amount          numeric not null,
  amount_in_words     text not null,
  status              text not null check (status in ('draft','unpaid','paid','reversed')),
  paid_date           date,
  pdf_url             text,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (company_id, invoice_number)
);

create index invoices_company_date_idx   on public.invoices (company_id, invoice_date desc);
create index invoices_company_status_idx on public.invoices (company_id, status);

create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.trips (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete restrict,
  vehicle_id    uuid not null references public.vehicles(id) on delete restrict,
  date          date not null,
  car_type      text not null,
  mode          text not null check (mode in ('local','outstation')),
  total_kms     int  not null,
  total_hours   numeric not null default 0,
  night         boolean not null default false,
  driver_ta     int  not null default 0,
  toll          numeric not null default 0,
  notes         text,
  duty_slip_no  text,
  invoiced      boolean not null default false,
  invoice_id    uuid references public.invoices(id) on delete set null,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index trips_company_date_idx     on public.trips (company_id, date desc, client_id);
create index trips_company_invoiced_idx on public.trips (company_id, invoiced);
create index trips_invoice_idx          on public.trips (invoice_id);

create trigger trg_trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

create table public.invoice_lines (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices(id) on delete cascade,
  trip_id       uuid references public.trips(id) on delete set null,
  date          text,
  vehicle_label text,
  hsn_code      text default '996601',
  particulars   text,
  qty           numeric,
  rate          numeric,
  amount        numeric not null,
  sort_order    int not null default 0
);

create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

-- Per-user bulk-add draft for the laptop "log many trips" flow.
create table public.bulk_drafts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  rows        jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, user_id)
);

create trigger trg_bulk_drafts_updated_at
  before update on public.bulk_drafts
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Atomic invoice + quotation number allocation
-- Uses UPDATE ... RETURNING which takes a row-level lock automatically.
-- =============================================================================

create or replace function public.allocate_invoice_number(p_company_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocated int;
begin
  if not exists (
    select 1 from public.memberships
    where company_id = p_company_id
      and user_id = auth.uid()
      and role in ('owner','admin','staff')
  ) then
    raise exception 'not authorized to allocate invoice number for company %', p_company_id;
  end if;

  update public.companies
     set next_invoice_number = next_invoice_number + 1,
         updated_at = now()
   where id = p_company_id
  returning next_invoice_number - 1 into v_allocated;

  if v_allocated is null then
    raise exception 'company % not found', p_company_id;
  end if;

  return v_allocated;
end;
$$;

create or replace function public.allocate_quotation_number(p_company_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocated int;
begin
  if not exists (
    select 1 from public.memberships
    where company_id = p_company_id
      and user_id = auth.uid()
      and role in ('owner','admin','staff')
  ) then
    raise exception 'not authorized to allocate quotation number for company %', p_company_id;
  end if;

  update public.companies
     set next_quotation_number = next_quotation_number + 1,
         updated_at = now()
   where id = p_company_id
  returning next_quotation_number - 1 into v_allocated;

  if v_allocated is null then
    raise exception 'company % not found', p_company_id;
  end if;

  return v_allocated;
end;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Helper expression: companies the current user is a member of (any role).
-- Inlined into policies; kept as a comment here for reference.
-- (select company_id from public.memberships where user_id = auth.uid())

alter table public.companies       enable row level security;
alter table public.memberships     enable row level security;
alter table public.clients         enable row level security;
alter table public.vehicles        enable row level security;
alter table public.quotations      enable row level security;
alter table public.quotation_lines enable row level security;
alter table public.rate_cards      enable row level security;
alter table public.invoices        enable row level security;
alter table public.trips           enable row level security;
alter table public.invoice_lines   enable row level security;
alter table public.bulk_drafts     enable row level security;

-- ---------- companies ----------
create policy "members can read their company"
  on public.companies for select
  using (
    id in (select company_id from public.memberships where user_id = auth.uid())
  );

create policy "authenticated users can create a company"
  on public.companies for insert
  with check (auth.uid() is not null);

create policy "owners and admins can update company"
  on public.companies for update
  using (
    id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

create policy "owners can delete company"
  on public.companies for delete
  using (
    id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ---------- memberships ----------
-- Read: see your own memberships OR memberships of companies you belong to.
create policy "members can read memberships of their companies"
  on public.memberships for select
  using (
    user_id = auth.uid()
    or company_id in (select company_id from public.memberships m where m.user_id = auth.uid())
  );

-- Insert: a user can insert their own membership (for self-onboarding as owner),
-- OR an owner/admin of the company can insert someone else's membership (invite flow).
create policy "users can insert own membership or owners can invite"
  on public.memberships for insert
  with check (
    user_id = auth.uid()
    or company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

create policy "owners and admins can update memberships"
  on public.memberships for update
  using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

create policy "owners and admins can remove memberships"
  on public.memberships for delete
  using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- ---------- Generic helper to apply the standard per-tenant policy to a business table ----------
-- We can't use a function for policy bodies, so the SQL is repeated below for each table.
-- Pattern:
--   SELECT  -> any member
--   ALL     -> non-viewer member

-- clients
create policy "members read clients"
  on public.clients for select
  using (company_id in (select company_id from public.memberships where user_id = auth.uid()));
create policy "non-viewers write clients"
  on public.clients for all
  using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  )
  with check (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  );

-- vehicles
create policy "members read vehicles"
  on public.vehicles for select
  using (company_id in (select company_id from public.memberships where user_id = auth.uid()));
create policy "non-viewers write vehicles"
  on public.vehicles for all
  using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  )
  with check (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  );

-- quotations
create policy "members read quotations"
  on public.quotations for select
  using (company_id in (select company_id from public.memberships where user_id = auth.uid()));
create policy "non-viewers write quotations"
  on public.quotations for all
  using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  )
  with check (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  );

-- quotation_lines: tenancy enforced via parent quotation.
create policy "members read quotation_lines"
  on public.quotation_lines for select
  using (
    quotation_id in (
      select q.id from public.quotations q
      where q.company_id in (select company_id from public.memberships where user_id = auth.uid())
    )
  );
create policy "non-viewers write quotation_lines"
  on public.quotation_lines for all
  using (
    quotation_id in (
      select q.id from public.quotations q
      where q.company_id in (
        select company_id from public.memberships
        where user_id = auth.uid() and role in ('owner','admin','staff')
      )
    )
  )
  with check (
    quotation_id in (
      select q.id from public.quotations q
      where q.company_id in (
        select company_id from public.memberships
        where user_id = auth.uid() and role in ('owner','admin','staff')
      )
    )
  );

-- rate_cards
create policy "members read rate_cards"
  on public.rate_cards for select
  using (company_id in (select company_id from public.memberships where user_id = auth.uid()));
create policy "non-viewers write rate_cards"
  on public.rate_cards for all
  using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  )
  with check (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  );

-- invoices
create policy "members read invoices"
  on public.invoices for select
  using (company_id in (select company_id from public.memberships where user_id = auth.uid()));
create policy "non-viewers write invoices"
  on public.invoices for all
  using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  )
  with check (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  );

-- trips
create policy "members read trips"
  on public.trips for select
  using (company_id in (select company_id from public.memberships where user_id = auth.uid()));
create policy "non-viewers write trips"
  on public.trips for all
  using (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  )
  with check (
    company_id in (
      select company_id from public.memberships
      where user_id = auth.uid() and role in ('owner','admin','staff')
    )
  );

-- invoice_lines: tenancy enforced via parent invoice.
create policy "members read invoice_lines"
  on public.invoice_lines for select
  using (
    invoice_id in (
      select i.id from public.invoices i
      where i.company_id in (select company_id from public.memberships where user_id = auth.uid())
    )
  );
create policy "non-viewers write invoice_lines"
  on public.invoice_lines for all
  using (
    invoice_id in (
      select i.id from public.invoices i
      where i.company_id in (
        select company_id from public.memberships
        where user_id = auth.uid() and role in ('owner','admin','staff')
      )
    )
  )
  with check (
    invoice_id in (
      select i.id from public.invoices i
      where i.company_id in (
        select company_id from public.memberships
        where user_id = auth.uid() and role in ('owner','admin','staff')
      )
    )
  );

-- bulk_drafts: each user only sees their own draft.
create policy "users read own bulk drafts"
  on public.bulk_drafts for select
  using (user_id = auth.uid());
create policy "users write own bulk drafts"
  on public.bulk_drafts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
