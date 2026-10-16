# CLAUDE.md

Project memory for Claude Code sessions working in this repo. Read this
first. `@AGENTS.md` below still applies (Next.js version note).

@AGENTS.md

## What this is

**TaxiMunshi** (product name as of 2026-10-11, rebranded from the earlier
working name "EasyBills" — if you see "EasyBills" anywhere it's a stale
leftover, not an intentional dual-brand) **/ Krishna Cabs** — a multi-tenant
SaaS app for small cab/fleet operators in India: clients, vehicles, rate
cards, quotations, trips, and GST-compliant invoices. Built for a real
customer (Krishna Cabs, Gurugram) replacing an Excel/Word workflow. The
original spec is `BUILD-SPEC.md` (historical — the app has gone well past
v1 of that doc; don't treat it as current state, only as background on
original intent).

As of 2026-10-07 the product is moving from open self-signup to
**invite-only SaaS** with a platform-admin panel (see "Branch state" below)
— ask before assuming new companies can self-onboard.

A public marketing/waitlist landing page (hero, animated mascot, pricing,
FAQ) lives at `src/app/(landing)/` — a deliberately separate route group
from `src/app/(marketing)/` (which still covers /privacy, /terms, /contact
with a shared thin header) because the landing page brings its own full
header and footer. Don't merge the two layouts.

## Tech stack

Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, Supabase
(Postgres + Auth + Storage), `@react-pdf/renderer` for PDFs,
`react-hook-form` + `zod`, `vitest` for tests. No ORM, no separate state
library — Server Components + `useState`, Supabase JS client directly.

## Multi-tenancy — the architectural backbone

- A **company** is a row in `companies`. Every business table carries
  `company_id`. Postgres RLS enforces isolation per company.
- **Roles per company** (`memberships.role`): `owner`, `admin`, `staff`,
  `viewer`. A user can belong to multiple companies (a cookie-based
  switcher in the top bar picks which one is "current" — see
  `src/lib/current-company.ts`).
- Server-side helpers in `src/lib/auth.ts`:
  - `requireMembership()` — current user + their resolved membership
    (switcher-aware) + full membership list. Use in Server Components.
  - `requireWriter()` — for Server Actions. Resolves the same
    switcher-aware company, rejects `viewer` role, rejects a **suspended**
    company, returns the service-role admin client for tenant-scoped
    writes.
  - `requireSuperAdmin()` / `requireSuperAdminAction()` — platform-level
    check, entirely separate from company roles (see below).
- **Never trust RLS alone for writes.** App code writes through the
  service-role admin client (`createAdminClient()`), scoping every query
  by `company_id` explicitly. RLS is the safety net for anything that
  somehow reaches Supabase directly with a user's own session.

## Critical invariants — do not change without being asked

1. **Invoices are immutable once issued** in the sense that matters: lines
   are frozen in `invoice_lines` at issue time. Editing a trip afterward
   does not change the invoice. An explicit "Edit invoice" flow exists
   (`/invoices/:id/edit`) for fixing mistakes, but it's restricted: paid
   and reversed ("undone") invoices cannot be edited at all (hidden in
   the UI, blocked in the page, blocked in the server action); editing an
   issued-but-unpaid invoice requires a confirmation dialog first, since
   it may already be with the client.
2. **Reversing an invoice** sets status to `reversed` (never deletes) and
   frees its trips (`invoiced = false`). The invoice number stays
   reserved; only deleting an already-reversed (or still-draft) invoice
   frees the number for reuse.
3. **Invoice numbers are per-company sequential**, allocated through the
   `allocate_invoice_number` Postgres function (migration 0012) with a
   row lock, called through the user-scoped client (not the admin
   client) so `auth.uid()` resolves inside the function.
4. **GST has exactly three branches** (`src/lib/gst.ts`), do not change
   the percentages or add a fourth:
   - Client `is_rcm = true` → `RCM`, zero GST charged.
   - Client state ≠ company state → `IGST` at 5%.
   - Same state → `CGST_SGST`, 2.5% + 2.5%.
5. **Number-to-words** (`src/lib/number-to-words.ts`) has exact test-locked
   output strings for the Indian lakh/crore system — see
   `number-to-words.test.ts` before touching it.
6. Trips with `invoiced = true` must never be deleted.

## Platform admin / invite-only layer (new, see branch state)

- `companies.status`: `invited | active | suspended`. `invited` means
  "account created, temporary password issued, first login not done yet"
  — displayed in `/admin` as "Password sent" or "Password expired"
  depending on whether 7 days have passed (`src/lib/temp-password-state.ts`).
  Suspended companies keep all data; every page for their users is
  replaced by a paused notice (`src/app/(app)/layout.tsx`), enforced again
  inside `requireWriter()` so writes are blocked server-side too, not just
  hidden.
- **No invite-links, no invites table.** The admin panel ("+ New company")
  and team invites (Settings) both create the auth user and membership
  directly with a generated temporary password (`src/lib/temp-password.ts`)
  — no link to click, no separate accept step. Whether someone still needs
  to set their own password lives on the auth user's own metadata
  (`must_change_password` / `temp_password_set_at` via
  `src/lib/temp-password-state.ts`), not in a project table, since it's a
  property of the login, not of any one company. Enforced in
  `src/lib/supabase/middleware.ts`: a signed-in user with
  `must_change_password` set can't reach any page except `/set-password`
  and `/sign-out`, even by typing a URL directly. The 7-day expiry is
  checked at sign-in time (`src/app/sign-in/actions.ts`) — an expired
  temporary password signs the session back out immediately with
  "Contact us for a new one."
- `super_admins`: a bare allow-list, RLS-enabled with **zero policies**
  (service-role only, no screen ever writes to it — add a row by hand in
  the SQL editor).
- Email goes through `src/lib/email/send.ts`, a thin Resend HTTP wrapper.
  Without `RESEND_API_KEY`/`EMAIL_FROM` set, sends are logged to the
  console instead of failing — convenient for local testing, not for
  production. Team invites never send email (copy/share manually, same as
  before this layer existed) — only owner accounts created via `/admin` do.
- The brand name used in admin-issued emails and "Copy login details" text
  is one setting, `PLATFORM_BRAND_NAME` in `src/lib/platform-config.ts` —
  currently "Cab Invoicing" as a placeholder, independent of the
  TaxiMunshi-branded public marketing site.

## Known environment quirks

- `npm run check-rls` needs the Supabase project's "Exposed schemas"
  setting to include `pg_catalog` to introspect RLS over the REST API.
  If it isn't, the script fails with a clear message and prints the
  equivalent SQL to paste into the Supabase SQL editor by hand.
- `npm run lint` currently reports a pre-existing baseline of **24
  errors / ~14 warnings**, all in `src/components/ui/sample-rows.tsx`,
  `src/lib/use-is-mobile.ts`, and a couple of PDF test files — unrelated
  to any of the branches below. Confirm lint output against this
  baseline rather than assuming new work caused the count; don't go
  fixing them incidentally while working on something else.
- Migrations are plain SQL files under `supabase/migrations/`, applied by
  hand via the Supabase SQL editor — there's no Supabase CLI link in this
  repo, no automatic migration runner.

## Branch state (as of 2026-10-07)

- **`main`** — stable, matches `origin/main`.
- **`feat/edit-invoice`** (3 commits ahead of main, pushed to origin) —
  adds `/invoices/:id/edit`: change date/period/trips/charges on an
  existing invoice, with the paid/reversed/unpaid restrictions described
  above. Done, tested, ready to merge/review.
- **`feat/bulk-select-share-invoices`** (1 commit ahead of main, **not
  yet pushed**) — multi-select to bulk-share invoices via the share
  sheet. Done.
- **`feat/invite-only-admin`** — superseded by `feat/saas-access` below,
  kept only for reference (stashed, never committed).
- **`feat/saas-access`** (currently **uncommitted** — exists only as
  working-tree changes; merged up to date with `main` as of this entry)
  — the invite-only SaaS + `/admin` platform panel described above, on
  the temporary-password model (no invite links). Built and
  self-verified (typecheck/tests/lint clean against baseline) but
  **awaiting the user's manual click-through confirmation before it gets
  committed** — do not commit this branch's changes without that
  confirmation. The migration (`0015_saas_access.sql`) has not been run
  against the real Supabase project yet.
- **`fix/invoice-page-packing-and-charge-memory`** — identical to main,
  effectively merged/stale; matches `origin`.

## Working conventions seen in this repo

- Server Actions return `{ ok: true, ... } | { ok: false, error: string }`
  rather than throwing, with user-facing plain-English error strings.
- New DB columns/tables get a new numbered migration file
  (`NNNN_description.sql`), never edit an already-applied one.
- Tests live next to the code they cover (`*.test.ts(x)`), run with
  `npm test` (vitest).
- Prefer editing existing files and reusing existing UI primitives
  (`src/components/ui/*`) over introducing new patterns.
