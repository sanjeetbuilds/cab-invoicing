-- =============================================================================
-- Draft invoice deletion with LIFO number return.
--
-- A draft invoice (status 'draft') was never issued, so its number may be
-- returned to the pool. We only return it when it is the most recently
-- allocated number, that is next_invoice_number is exactly one above it.
-- Otherwise an issued invoice already sits above it and returning the number
-- would create a duplicate or a confusing out-of-order series, so we leave a
-- gap instead. Issued invoices ('unpaid', 'paid', 'reversed') keep their
-- numbers forever and cannot be deleted through this function.
--
-- Runs as SECURITY DEFINER so it bypasses RLS, with an explicit role check,
-- and locks the company row so the conditional decrement is safe against a
-- concurrent allocate_invoice_number call.
-- =============================================================================

create or replace function public.delete_draft_invoice(
  p_company_id uuid,
  p_invoice_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status   text;
  v_number   int;
  v_company  uuid;
  v_freed    int := null;
begin
  if not exists (
    select 1 from public.memberships
    where company_id = p_company_id
      and user_id = auth.uid()
      and role in ('owner','admin','staff')
  ) then
    raise exception 'not authorized to delete draft for company %', p_company_id;
  end if;

  -- Lock the counter row so the conditional decrement below cannot race a
  -- concurrent allocate_invoice_number for this company.
  perform 1 from public.companies where id = p_company_id for update;

  select status, invoice_number, company_id
    into v_status, v_number, v_company
    from public.invoices
   where id = p_invoice_id;

  if v_number is null then
    raise exception 'invoice % not found', p_invoice_id;
  end if;
  if v_company <> p_company_id then
    raise exception 'invoice % does not belong to company %', p_invoice_id, p_company_id;
  end if;
  if v_status <> 'draft' then
    raise exception 'only draft invoices can be deleted (invoice % is %)', p_invoice_id, v_status;
  end if;

  -- Free the trips this draft was holding so they can be billed again.
  update public.trips
     set invoiced = false, invoice_id = null
   where invoice_id = p_invoice_id
     and company_id = p_company_id;

  -- Delete the draft. invoice_lines cascade on the foreign key.
  delete from public.invoices where id = p_invoice_id;

  -- Return the number to the pool only when it was the most recent one
  -- allocated. Otherwise leave the gap.
  update public.companies
     set next_invoice_number = v_number,
         updated_at = now()
   where id = p_company_id
     and next_invoice_number = v_number + 1
  returning next_invoice_number into v_freed;

  return v_freed; -- the number now free to reuse, or null when a gap remains
end;
$$;
