# Krishna Cabs — Build Spec for Claude Code

> A multi-tenant SaaS web app for cab service companies to manage clients, rate cards, quotations, trips, and invoices. Optimized for laptop (work mode) and mobile (check/light-edit mode).

## How to use this spec

1. Save this file as `BUILD-SPEC.md` in an empty folder on your laptop.
2. Open a terminal in that folder.
3. Run `claude` (Claude Code's CLI command).
4. Paste this exact prompt:

> Read BUILD-SPEC.md. We will build the app in milestones. After each milestone, pause and ask me to confirm before moving on. If anything in the spec is unclear, ask me. If you find a better approach than what's specified, propose it before implementing.

5. Follow Claude Code's prompts. Don't skip ahead.

---

## Project: Krishna Cabs SaaS

**One-line description:** A cab fleet operator (or any small fleet business) uses this to onboard clients, send quotations, log daily trips, generate monthly GST-compliant invoices, and track payments.

**Real customer (and primary user):** Krishna Cabs, Gurugram, Haryana, India. ~10 corporate clients, ~10 vehicles (own + attached vendor cars), 10–30 invoices per month, currently using Excel + Word manually.

**Pricing model (future):** Free tier for one cab company, paid tier for multi-company use. Not implemented in v1 — schema supports it.

---

## Critical context Claude Code must understand

This spec was developed iteratively from a working HTML prototype the user has already validated. The prototype tested all the GST logic, the invoice math, the number-to-words conversion, and the data model. Treat the spec as authoritative for the data model and business logic. UI may improve on the prototype, but the data model and calculations must match exactly.

The user has **low technical comfort**. Explain what you're doing in plain language at every step. After installing anything, show what was installed. After deploying, show the URL. Don't assume the user understands terms like "RLS", "JWT", "CSR vs SSR" — explain when relevant or simply mention "this is a security thing, set up correctly" and move on.

---

## Tech stack (non-negotiable)

| Layer | Choice | Why |
|-|-|-|
| Framework | Next.js 14 with App Router | Server-rendered, fast, great mobile UX, easy deploy |
| Styling | Tailwind CSS | Mobile-first responsive utilities |
| UI components | shadcn/ui | Clean, accessible, customisable |
| Database | Supabase (Postgres) | Free tier, has built-in auth + RLS |
| Auth | Supabase Auth (magic link via email) | No passwords for users to forget |
| Hosting | Vercel | Free tier, GitHub-connected auto-deploy |
| PDF generation | `@react-pdf/renderer` or `pdfmake` | Server-side, identical output across devices |
| Icons | `lucide-react` | Lightweight, tree-shakeable |
| Date library | `date-fns` | Tree-shakeable, locale-friendly |
| Forms | `react-hook-form` + `zod` | Validation, no boilerplate |
| State | React Server Components + `useState` for UI, no Redux | Keep it simple |
| Deployment | GitHub → Vercel (auto on push) | Standard, free |

Do not introduce other stacks. Do not use a separate ORM (Prisma, Drizzle) — use Supabase's JS client directly. Do not use a UI framework that fights Tailwind.

---

## Multi-tenancy model

This is the architectural backbone. Get this right or everything downstream is broken.

### Structure

- A **company** (= tenant) is a row in the `companies` table.
- A company has **members** (users with roles).
- Every business record (clients, trips, invoices, etc.) has a `company_id` foreign key.
- Postgres Row Level Security (RLS) policies ensure a user can only read/write rows where they are a member of `company_id`.

### Roles per company

- `owner` — full access, can invite/remove members, change company settings, delete data
- `admin` — full data access, can invite staff, cannot delete company
- `staff` — can read/write data, cannot manage members
- `viewer` — read-only (for accountants, auditors)

### Sign-up flow

- New user signs up → creates a new company → becomes its owner.
- Owner invites others by email; they join as members of the same company.
- A user can be a member of multiple companies (rare, but support it). The UI has a company-switcher in the header.

### RLS policies (must be set up in Supabase)

For every table that has `company_id`:

```sql
-- Read access
CREATE POLICY "members can read their company's data" ON {table_name}
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- Write access (with role check where needed)
CREATE POLICY "non-viewers can write their company's data" ON {table_name}
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin','staff')
    )
  );
```

Claude Code must write a SQL migration file that creates these policies for every business table. Do not skip this — without RLS, any logged-in user can read every other tenant's data.

---

## Database schema

All tables use `uuid` primary keys (`uuid_generate_v4()`) and have `created_at`, `updated_at` timestamps. Snake_case column names.

### Auth & tenancy

```
companies
  id uuid pk
  name text not null
  address text
  gstin text                       -- the cab company's own GSTIN
  phone text
  email text
  state text not null              -- e.g. "Haryana" — drives intra-state vs IGST logic
  invoice_prefix text default ''
  next_invoice_number int default 1
  quotation_prefix text default 'Q-'
  next_quotation_number int default 1
  terms_invoice text[]             -- array of strings, one per term
  terms_quotation text[]
  plan text default 'free'         -- 'free' | 'pro' (for future billing)
  created_at, updated_at

memberships
  id uuid pk
  company_id uuid fk → companies(id) on delete cascade
  user_id uuid fk → auth.users(id) on delete cascade
  role text not null               -- 'owner' | 'admin' | 'staff' | 'viewer'
  invited_email text               -- nullable, for pending invites
  accepted_at timestamptz
  created_at
  unique (company_id, user_id)
```

### Business data

```
clients
  id uuid pk
  company_id uuid fk → companies(id) on delete cascade
  name text not null
  gstin text
  address text
  state text not null              -- drives IGST vs CGST/SGST
  is_rcm boolean default false     -- if true, no GST charged on invoice
  default_booked_by text           -- contact person at the client
  notes text
  created_at, updated_at
  index on (company_id, name)

vehicles
  id uuid pk
  company_id uuid fk → companies(id) on delete cascade
  number text not null             -- e.g. "HR 26 ED 9083"
  type text not null               -- 'Dzire' | 'Sonet' | 'Crysta' | 'Innova' | 'Ertiga' | 'Other'
  ownership text not null          -- 'own' | 'attached'
  vendor_name text                 -- if ownership = attached
  active boolean default true
  created_at, updated_at
  unique (company_id, number)

rate_cards
  id uuid pk
  company_id uuid fk → companies(id) on delete cascade
  client_id uuid fk → clients(id) on delete cascade
  car_type text not null
  mode text not null               -- 'local' | 'outstation'
  -- local mode fields:
  base_rate numeric
  base_kms int default 80
  base_hours int default 8
  extra_km numeric
  extra_hour numeric
  night numeric
  -- outstation mode field:
  per_km numeric
  -- common:
  driver_ta numeric                -- per day (per TA count on a trip)
  source_quotation_id uuid fk → quotations(id)  -- nullable, where this rate came from
  active_from date default current_date
  created_at, updated_at
  unique (company_id, client_id, car_type, mode)
  -- Only one active rate per (client, car_type, mode) at a time.

trips
  id uuid pk
  company_id uuid fk → companies(id) on delete cascade
  client_id uuid fk → clients(id) on delete cascade
  vehicle_id uuid fk → vehicles(id) on delete restrict
  date date not null
  car_type text not null           -- copied from vehicle at trip creation; can be overridden
  mode text not null               -- 'local' | 'outstation'
  total_kms int not null
  total_hours numeric default 0
  night boolean default false
  driver_ta int default 0          -- count of days
  toll numeric default 0
  notes text
  duty_slip_no text                -- the paper slip number, for cross-reference
  invoiced boolean default false
  invoice_id uuid fk → invoices(id) on delete set null
  created_by uuid fk → auth.users(id)
  created_at, updated_at
  index on (company_id, date, client_id)
  index on (company_id, invoiced)

quotations
  id uuid pk
  company_id uuid fk → companies(id) on delete cascade
  number text not null             -- 'Q-2026-001' etc
  client_id uuid fk → clients(id)  -- nullable for "draft for new client"
  -- snapshot fields (in case client edits later):
  client_name text
  client_address text
  client_gstin text
  client_contact text
  date date not null
  valid_until date
  status text not null             -- 'draft' | 'sent' | 'accepted' | 'expired' | 'rejected'
  notes text
  source_pdf_url text              -- if uploaded
  created_by uuid fk → auth.users(id)
  created_at, updated_at
  accepted_at timestamptz
  unique (company_id, number)

quotation_lines
  id uuid pk
  quotation_id uuid fk → quotations(id) on delete cascade
  car_type text not null
  mode text not null
  base_rate numeric
  base_kms int
  base_hours int
  extra_km numeric
  extra_hour numeric
  night numeric
  per_km numeric
  driver_ta numeric
  sort_order int default 0

invoices
  id uuid pk
  company_id uuid fk → companies(id) on delete cascade
  invoice_number int not null      -- numeric, the company's running counter value
  invoice_date date not null
  client_id uuid fk → clients(id)
  -- snapshot at time of issue:
  client_name text
  client_address text
  client_gstin text
  client_booked_by text
  period_from date
  period_to date
  subtotal numeric not null
  gst_mode text not null           -- 'RCM' | 'CGST_SGST' | 'IGST'
  cgst numeric default 0
  sgst numeric default 0
  igst numeric default 0
  toll_total numeric default 0
  net_amount numeric not null
  amount_in_words text not null
  status text not null             -- 'draft' | 'unpaid' | 'paid' | 'reversed'
  paid_date date
  pdf_url text                     -- generated and stored in Supabase Storage
  created_by uuid fk → auth.users(id)
  created_at, updated_at
  unique (company_id, invoice_number)
  index on (company_id, invoice_date)
  index on (company_id, status)

invoice_lines
  id uuid pk
  invoice_id uuid fk → invoices(id) on delete cascade
  trip_id uuid fk → trips(id) on delete set null
  -- frozen line items (immutable once issued):
  date text                        -- displayed format, e.g. "15/4/26"
  vehicle_label text               -- e.g. "9083 Sonet"
  hsn_code text default '996601'
  particulars text                 -- can contain \n
  qty numeric
  rate numeric
  amount numeric not null
  sort_order int default 0
```

### Critical invariants

1. **Invoices are immutable once issued.** Lines are frozen in `invoice_lines`. Editing a trip after invoicing does NOT change the invoice.
2. **Reversing an invoice** sets its status to `reversed` (don't delete) and marks the linked trips as `invoiced = false`. Keep the invoice number reserved — do not reuse.
3. **Invoice numbers are per-company sequential.** Use a Postgres function with `FOR UPDATE` row-lock on `companies.next_invoice_number` to prevent gaps or duplicates under concurrent issuance.
4. **Trips invoiced=true must never be deleted** — return a user-friendly error.

---

## Business logic (port exactly from prototype)

### Computing a trip's line items

Given a trip and the active rate card for (client, car_type, mode):

**Local mode:**
- Line 1: base — particulars = `"Total {total_kms}kms\n{base_kms}kms/{base_hours}hrs"` if total_kms > base_kms, else `"{base_kms}kms/{base_hours}hrs"`. Amount = base_rate.
- If `total_kms > base_kms`: Line — particulars = `"Additional kms"`, qty = `total_kms - base_kms`, rate = `extra_km`, amount = qty × rate.
- If `total_hours > base_hours`: Line — particulars = `"Additional hrs"`, qty = `total_hours - base_hours`, rate = `extra_hour`.
- If `night == true`: Line — particulars = `"Night Charges"`, amount = `night`.
- If `driver_ta > 0`: Line — particulars = `"Driver's TA"`, qty = `driver_ta`, rate = `driver_ta` rate, amount = qty × rate.

**Outstation mode:**
- Line 1: particulars = `"Total kms {total_kms}"`, qty = total_kms, rate = per_km, amount = qty × rate.
- If `driver_ta > 0`: same TA line as above.

### GST calculation

```
function gstFor(client, subtotal, company):
  if client.is_rcm:
    return { mode: 'RCM', cgst: 0, sgst: 0, igst: 0,
             labels: { cgst: 'CGST @ 2.5% Under RCM', sgst: 'SGST @ 2.5% Under RCM' } }
  if client.state != company.state:
    return { mode: 'IGST', cgst: 0, sgst: 0, igst: round(subtotal * 0.05, 2),
             labels: { igst: 'IGST @ 5%' } }
  return { mode: 'CGST_SGST',
           cgst: round(subtotal * 0.025, 2),
           sgst: round(subtotal * 0.025, 2),
           igst: 0,
           labels: { cgst: 'CGST @ 2.5%', sgst: 'SGST @ 2.5%' } }
```

### Number to words (Indian numbering system)

Must produce strings that match these test cases exactly:

| Input | Output |
|-|-|
| 0 | Zero |
| 5800 | Five Thousand Eight Hundred |
| 14073 | Fourteen Thousand & Seventy Three |
| 27640 | Twenty Seven Thousand Six Hundred & Forty |
| 29794 | Twenty Nine Thousand Seven Hundred & Ninety Four |
| 32637 | Thirty Two Thousand Six Hundred & Thirty Seven |
| 37305 | Thirty Seven Thousand Three Hundred & Five |
| 100000 | One Lakh |
| 105050 | One Lakh Five Thousand & Fifty |

Algorithm: split into crore / lakh / thousand / hundreds. The "& " separator goes before the last two-digit group only when there's no hundreds digit but there is a higher group, OR between hundreds and the trailing two digits. Write unit tests for these cases.

### Invoice math verification

These trips should produce these line totals (drawn from real invoices):

| Trip | Expected line total |
|-|-|
| FHPL 17 Apr 2026, Sonet local, 149km, 9.5hr, night | ₹2,985 (= 1500 + 1035 + 150 + 300) |
| Paras 15-16 Apr 2026, Sonet outstation, 707km, 2 TA | ₹11,205 (= 707×15 + 2×300) |
| Bharti 22 Apr 2026, Dzire outstation, 474km, 1 TA | ₹6,936 (= 474×14 + 1×300) |
| Metalman 14 Apr 2026, Sonet local 159km, 13hr | ₹3,614 (= 1600 + 79×16 + 5×150) |

These should be written as automated tests.

---

## Application screens

### Mobile-first responsive philosophy

- **Mobile (<768px):** single-column, stack everything. Tables become cards. Long forms become single-field-per-screen wizards where helpful. Hide laptop-only screens (bulk add) and direct user to laptop.
- **Tablet (768–1024px):** two-column where it helps, native table layouts.
- **Laptop (>1024px):** full sidebar layout, multi-column forms, wide tables, side-by-side previews.

Layout: persistent sidebar on desktop (collapses to hamburger on mobile). Bottom navigation bar on mobile with 5 icons: Dashboard, Trips, Invoices, Quotations, More (opens the rest as a drawer).

### Screens list

#### 1. Sign-in (`/sign-in`)
- Email field, "Send magic link" button. No password.
- After submit: "Check your email for a link."

#### 2. Onboarding (`/onboarding`)
- First time login → create your company. Form: name, address, phone, email, GSTIN, state (dropdown of Indian states), invoice prefix (optional), starting invoice number (default 1).
- On submit → creates `companies` row + a `memberships` row with role=owner, redirects to dashboard.

#### 3. Dashboard (`/`)
- Stats: unbilled trips, pending quotes, outstanding amount, total billed this month.
- Banner if user has a bulk-add draft (per Phase 1 prototype).
- "Unbilled trips by client" table with "Build invoice →" CTAs.
- Recent invoices list (last 5).
- Mobile: stats as a 2-column grid, tables become cards.

#### 4. Trips (`/trips`)
- Filters: client, status, date range. Sticky on mobile.
- List/table of trips. On mobile: cards showing date, client, vehicle, computed amount, status.
- FAB (floating action button) "+ Log trip" — opens single-trip form (works on both devices).
- "Bulk add" button — laptop only; mobile shows "Open on laptop for bulk entry."

#### 5. Bulk add trips modal (`/trips/bulk`) — laptop only
- Full table as in the prototype: sticky header, computed total per row, running total, draft auto-saved to Supabase (a `bulk_drafts` table keyed by user_id+company_id).
- Keyboard-driven: tab between cells, Enter on last toll cell adds a new row.
- "Duplicate row" button per row.
- "Save N ready trips" — incomplete rows stay in draft for next session.

#### 6. Invoices (`/invoices`)
- List: number, date, client, period, GST mode, amount, status.
- Filters: status, client, date range.
- "Build invoice" — opens client picker (only clients with unbilled trips), then opens invoice builder.

#### 7. Invoice builder (`/invoices/build`)
- Form: invoice date, period from/to, trip checklist (all defaulted on), toll override field.
- Live preview: subtotal, GST lines (per client's RCM/intra/inter mode), toll, net.
- "Issue invoice" button — commits with next number, freezes line items.

#### 8. Invoice view (`/invoices/:id`)
- The print-styled invoice exactly matching the Krishna Cabs format from the prototype.
- Actions: Print/Save as PDF (uses server-generated PDF via @react-pdf/renderer), Mark paid / unpaid, Reverse, Share via WhatsApp (mobile native share sheet with pre-attached PDF URL).
- Must paginate correctly: repeating header on every page, table header repeated, totals + words + terms held together on last page, page numbers in footer.

#### 9. Quotations (`/quotations`)
- List with status pills.
- Actions: New, Upload existing PDF (extracts text via PDF.js client-side; PRO: also calls Claude API server-side for structured extraction — see "API call for PDF extraction" below).
- Quotation builder: same as prototype, with multi-line car/mode/rate entries.
- "Accept" → creates/updates rate cards for that client. If client doesn't exist yet, prompts to create.
- Quotation view: print-styled.

#### 10. Clients (`/clients`)
- List + create/edit form per prototype.
- Per-client detail page (`/clients/:id`) showing: rate cards, trip history, invoice history, total billed.

#### 11. Vehicles (`/vehicles`)
- List + create/edit form per prototype.

#### 12. Rate cards (`/rate-cards`)
- Grouped by client. Each card editable inline.
- Read-only view shows where each rate came from (which quotation).

#### 13. Settings (`/settings`)
- Tabs: Company info, Numbering, Terms (invoice + quotation), Team.
- **Team tab:** list of members with roles. Invite new member by email + role. Remove member. Change role.

#### 14. Profile (`/profile`)
- User's own email, name, password reset (Supabase handles).
- Company switcher if user is in multiple companies.

---

## API call for PDF extraction (server-side)

When user uploads a quotation or invoice PDF for rate extraction:

1. Client uploads file to Supabase Storage at `pdfs/{company_id}/{uuid}.pdf`.
2. Server route `/api/extract-pdf` takes the file URL.
3. Server uses `pdf-parse` to extract text.
4. Server calls Anthropic API with this prompt:

```
You are extracting rate card information from a cab service quotation or invoice PDF.

Return ONLY valid JSON in this exact schema:
{
  "client_name": string | null,
  "client_gstin": string | null,
  "client_address": string | null,
  "rate_lines": [
    {
      "car_type": "Dzire" | "Sonet" | "Crysta" | "Innova" | "Ertiga" | "Other",
      "mode": "local" | "outstation",
      "base_rate": number | null,
      "base_kms": number | null,
      "base_hours": number | null,
      "extra_km": number | null,
      "extra_hour": number | null,
      "night": number | null,
      "per_km": number | null,
      "driver_ta": number | null
    }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": string  // anything that needed manual interpretation
}

The PDF text follows. Extract conservatively — set fields to null if uncertain rather than guessing.

PDF text:
{extracted_text}
```

5. Return the JSON to the client. The client shows the extracted form pre-filled, user confirms/edits, then saves.

The Anthropic API key lives in `ANTHROPIC_API_KEY` env var, set in Vercel. Use the model name `claude-sonnet-4-6` (or the latest available at build time — Claude Code, ask the user to verify the model name at https://docs.claude.com if you're unsure).

---

## PDF generation for invoices and quotations

Use `@react-pdf/renderer`. Render server-side at `/api/invoices/:id/pdf` and `/api/quotations/:id/pdf`. Cache the generated PDF in Supabase Storage at `invoices/{company_id}/{invoice_id}.pdf` so it doesn't re-render on every download.

The PDF must exactly match the screen invoice layout from the prototype:
- Header: company name + contact (left), address + GSTIN (right)
- Border line below header
- Bill-to block (left) + invoice meta (right)
- Itemized table with HSN code column
- Totals block right-aligned
- Amount in words
- Terms in footer
- Page numbers: "Page X of Y" in footer

If invoice spans multiple pages: repeat header + table header on each, keep totals + words + terms together on final page, never split a single trip's lines across pages.

---

## Storage of source PDFs

The user wanted to upload existing quotations and invoices in bulk to bootstrap rates. The mechanism:

1. On Quotations page, "Upload PDF" button accepts multiple files.
2. Each file → uploaded to Supabase Storage under `source-pdfs/{company_id}/`.
3. For each file, the extraction flow above runs.
4. User reviews each extraction, edits if needed, hits "Save as quotation."
5. The original PDF stays in storage, linked via `quotations.source_pdf_url`.

Same flow for invoices, except they're not editable post-upload — they're "imported references" that can be viewed but don't affect the running system.

---

## Setup steps (Claude Code executes these in order, pausing between)

### Milestone 0: Local setup (do first, confirm before milestone 1)

1. Verify Node.js >= 20 is installed (`node -v`). If not, walk user through installing it from https://nodejs.org/.
2. Verify Git is installed. If not, walk user through it.
3. Verify user has a GitHub account. If not, walk through signup.
4. Initialize a Next.js project with TypeScript, Tailwind, App Router: `npx create-next-app@latest krishna-cabs --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"`.
5. Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, `date-fns`, `react-hook-form`, `zod`, `@hookform/resolvers`, `@react-pdf/renderer`, `pdf-parse`, `pdfjs-dist`, shadcn/ui CLI.
6. Initialize git, push to a new private GitHub repo.

**Pause and confirm with user.**

### Milestone 1: Supabase project + schema

1. Walk user through creating a Supabase project at https://supabase.com (free tier, region = closest to India, e.g., Mumbai).
2. Capture the project URL and anon key, put in `.env.local` and Vercel env vars.
3. Write a single SQL migration file `supabase/migrations/0001_init.sql` containing all the tables from the schema section above plus all RLS policies plus the invoice-number generation function.
4. Apply the migration via Supabase SQL editor (paste and run).
5. Enable Supabase Storage with two buckets: `pdfs` (private, authenticated read), `invoices` (private).
6. Enable email auth in Supabase Auth settings, configure magic link template.

**Pause. Verify by inserting a test row from the Supabase dashboard.**

### Milestone 2: Auth + onboarding

1. Set up the Supabase auth helpers for Next.js (`@supabase/ssr`).
2. Build `/sign-in` page (magic link form).
3. Build `/onboarding` page that creates the user's first company.
4. Build the auth middleware that gates all routes except `/sign-in`.
5. Build a basic shell layout with sidebar (desktop) + bottom nav (mobile) + company switcher.

**Pause. Test: sign in, create company, see empty dashboard.**

### Milestone 3: Clients, vehicles, rate cards

1. Clients CRUD with the schema fields.
2. Vehicles CRUD.
3. Rate cards: grouped by client, inline editable, supports both local and outstation modes.
4. Seed the user's existing 4 clients and 10 vehicles (data is in the prototype's seed function — Claude Code, ask the user to paste the prototype HTML or extract from the JSON the user exported from the prototype).

**Pause. Verify all CRUD works on both laptop and a phone.**

### Milestone 4: Trips (single + bulk)

1. Single-trip form with live computed preview.
2. Trips list with filters.
3. Bulk-add modal (laptop only) with:
   - Sticky header
   - Per-row live total
   - Running total in footer
   - Auto-saved draft (table `bulk_drafts` with `user_id`, `company_id`, `rows jsonb`, `updated_at`)
   - Duplicate row action
   - Save partial — keeps incomplete rows in draft
4. Write unit tests for `tripToLines()` matching the verification table above.

**Pause. Test bulk entry on laptop with 20+ rows.**

### Milestone 5: Invoices

1. Invoice builder UI.
2. Invoice issuance with Postgres function for atomic number allocation.
3. Invoice view with screen layout.
4. Server-side PDF generation matching the print layout. Test with both 1-page and 3-page invoices.
5. Mark paid / unpaid, reverse invoice.
6. WhatsApp share button on mobile (`navigator.share` with the PDF URL).
7. Write unit tests for `gstFor()` and `numberToWords()` matching the test cases above.

**Pause. Generate an invoice and verify against the prototype's output for the same input.**

### Milestone 6: Quotations + PDF extraction

1. Quotation CRUD with lines.
2. Quotation view + PDF.
3. "Accept" creates/updates rate cards.
4. Upload PDF → server-side extraction via Anthropic API → review/edit form → save.
5. Test with one of the user's actual quotation PDFs.

**Pause.**

### Milestone 7: Team & settings

1. Settings page with tabs.
2. Team management: invite by email, role assignment, remove members.
3. Verify RLS by creating a second test company and confirming data isolation.

**Pause.**

### Milestone 8: Polish + deploy

1. Mobile responsive sweep — every page on a phone-sized viewport.
2. Empty states and error states everywhere.
3. Loading skeletons.
4. Deploy to Vercel: connect GitHub repo, set env vars (Supabase URL, anon key, service role key, Anthropic API key), confirm deploy.
5. Test the deployed URL end-to-end on both laptop and phone.

**Done.**

---

## Constraints Claude Code must respect

- **Do not skip RLS.** Every table with `company_id` gets a policy. Test by creating two test companies and confirming user A cannot read user B's data.
- **Do not change the GST logic.** Three branches: RCM, intra-state CGST+SGST, inter-state IGST. Same percentages.
- **Do not change the number-to-words output.** Test cases above are non-negotiable.
- **Do not change the invoice format meaningfully.** It must look like the existing Krishna Cabs invoices. Layout choices are fine; sections, columns, and content are not.
- **Do not introduce a new state management library** (no Redux, no Zustand, no Jotai). Server Components + `useState` for UI state.
- **Do not skip the `bulk_drafts` table.** Mid-session draft loss is the worst-case UX failure.
- **Do not store sensitive data in localStorage** in the deployed version. All data lives in Supabase.

---

## What to ask the user before starting

After reading this spec, Claude Code, ask the user these before milestone 0:

1. "Do you have Node.js, Git, VS Code installed?" — walk through installs if not.
2. "Do you have a GitHub account?" — walk through signup if not.
3. "Do you have a Supabase account?" — walk through signup if not.
4. "Do you have a Vercel account?" — walk through signup if not.
5. "Can you share the prototype's exported JSON backup (sidebar → Export backup)?" — to seed real clients/vehicles. If user can't, ask them to paste the seed function from the prototype HTML.
6. "Do you have an Anthropic API key for PDF extraction?" — if not, skip the LLM extraction in milestone 6 and fall back to manual entry. The user can add it later.

---

## What "done" looks like

- A live URL (e.g. `krishna-cabs.vercel.app`) where the user can sign in.
- Their company seeded with their real clients, vehicles, rate cards.
- They can bulk-add 20 trips on their laptop in under 5 minutes.
- They can issue an invoice in 3 clicks and download a PDF that looks identical to their existing format.
- They can open the same URL on their phone, see the dashboard, mark an invoice paid.
- Dad has a separate login as `staff` and can do everything except change company settings.
- All data is private to their company — no cross-tenant leakage.

---

## After v1 is live

Phase 2 features the user has flagged for later but Claude Code should NOT build in v1:

- Driver phone PWA (drivers self-enter trips on their phones)
- Vendor receipts and per-trip margin reporting
- WhatsApp invoice sending automation (beyond the native share sheet)
- Payment recording with partial payments and automatic 18% interest on overdue
- Reports (monthly P&L per client, vehicle utilization, attached-vendor settlement)
- Email-the-invoice (one-click send via Gmail/Outlook integration)
- Multi-currency / multi-country (the GST logic is India-specific)
- Billing/subscription enforcement (free vs pro plan limits)

Note these in a `ROADMAP.md` in the repo for future reference.

---

## Final note to Claude Code

This user has invested time in a prototype that proved the data model and business logic work. They have low technical comfort but have made informed architectural choices. Be a patient guide:

- Explain what you're doing in plain language.
- After each milestone, show what was built and what to test.
- When errors come up, ask the user to copy-paste the full error text; don't ask them to interpret it.
- Default to the safer choice when in doubt (e.g., always preserve draft data, always confirm destructive actions).
- If the user asks for a feature outside this spec, evaluate whether it's a Phase 2 item and politely defer if so.

Build it well. The user is counting on this working in their daily business.
