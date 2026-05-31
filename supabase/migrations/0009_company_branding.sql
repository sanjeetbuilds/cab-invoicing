-- 0009_company_branding.sql
--
-- Per-tenant branding: companies pick how their identity appears in the
-- app shell and on PDFs. Three modes — plain text (default), logo only,
-- or logo + text — plus a stored aspect ratio so the renderer can size
-- the image without an extra HEAD request.

alter table public.companies
  add column if not exists brand_mode text not null default 'text_only'
    check (brand_mode in ('text_only','logo_only','logo_with_text')),
  add column if not exists logo_url text,
  add column if not exists logo_aspect_ratio numeric;

-- Public bucket for logos. Writes go through the admin client (which
-- bypasses RLS), so no per-tenant storage policy is required; the
-- service-role server actions are the only writers.
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;
