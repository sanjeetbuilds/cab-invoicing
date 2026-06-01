#!/usr/bin/env node
/**
 * RLS verification. Connects to the live Postgres database with the
 * Supabase service-role key and reports, per public-schema table:
 *
 *   - whether row-level security is ENABLED
 *   - how many policies are attached
 *
 * Fails non-zero if any of the required tables (companies, memberships,
 * clients, vehicles, rate_cards, trips, invoices, invoice_lines,
 * quotations, quotation_lines, bulk_drafts) has RLS disabled or zero
 * policies. The script catches the case where a migration claims RLS
 * is on but the live database never actually applied it.
 *
 * Usage:
 *   node scripts/check-rls.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
 * .env.local in the project root.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}

const MANUAL_SQL = `select
  t.tablename,
  c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = t.tablename) as policy_count
from pg_tables t
join pg_class c on c.relname = t.tablename
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
where t.schemaname = 'public'
order by t.tablename;`;

const REQUIRED_TABLES = [
  "companies",
  "memberships",
  "clients",
  "vehicles",
  "rate_cards",
  "trips",
  "invoices",
  "invoice_lines",
  "quotations",
  "quotation_lines",
  "bulk_drafts",
];

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (looked in .env.local and process.env).",
    );
    process.exit(2);
  }

  // PostgREST scopes .from() to the public schema by default. The
  // catalog views live in pg_catalog, so we have to ask Supabase to
  // expose that schema first. The project's REST config must include
  // pg_catalog in its exposed-schemas list; if it doesn't, we hit
  // PostgREST via raw HTTP and read the view through the response
  // shape PostgREST returns for unexposed schemas.
  //
  // Cheapest implementation: call the data API directly with a
  // ?select= against /pg_catalog.<view> via the Accept-Profile header.
  async function fetchCatalog(view, columns, schemaFilter = "public") {
    const r = await fetch(
      `${url}/rest/v1/${view}?select=${columns}&schemaname=eq.${schemaFilter}`,
      {
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          "accept-profile": "pg_catalog",
        },
      },
    );
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`${r.status} ${r.statusText} ${body}`);
    }
    return await r.json();
  }

  let data;
  let pols;
  try {
    data = await fetchCatalog("pg_tables", "schemaname,tablename,rowsecurity");
    pols = await fetchCatalog("pg_policies", "tablename");
  } catch (e) {
    console.error(`Couldn't query the catalog: ${e.message}`);
    console.error("");
    console.error("Two ways to fix this:");
    console.error(
      "  1. In the Supabase dashboard, API Settings, Exposed schemas, add 'pg_catalog'.",
    );
    console.error(
      "     (Safe: pg_catalog is read-only system metadata, the service role can already read it.)",
    );
    console.error(
      "  2. Or paste this SQL into the Supabase SQL editor to verify by hand:",
    );
    console.error("");
    console.error(MANUAL_SQL);
    process.exit(2);
  }
  // Reference to keep supabase-js available without using it (so the
  // script's import surface still proves the package resolves):
  void createClient;

  const policyCount = new Map();
  for (const row of pols ?? []) {
    policyCount.set(row.tablename, (policyCount.get(row.tablename) ?? 0) + 1);
  }

  console.log("");
  console.log(
    "table                 rls       policies   status",
  );
  console.log(
    "--------------------  --------  ---------  -------",
  );

  let failed = 0;
  const tablesInDb = new Set((data ?? []).map((r) => r.tablename));
  const checked = new Set();

  for (const t of REQUIRED_TABLES) {
    checked.add(t);
    const row = (data ?? []).find((r) => r.tablename === t);
    const rls = row?.rowsecurity ? "enabled" : "disabled";
    const count = policyCount.get(t) ?? 0;
    const ok = row?.rowsecurity && count > 0;
    if (!ok) failed++;
    const status = !row ? "MISSING" : ok ? "PASS" : "FAIL";
    console.log(
      `${t.padEnd(20)}  ${rls.padEnd(8)}  ${String(count).padEnd(9)}  ${status}`,
    );
  }

  // Surface any other public-schema tables so future additions are
  // visible. They don't fail the run unless one of the REQUIRED tables
  // does.
  const extras = [...tablesInDb]
    .filter((t) => !checked.has(t))
    .filter((t) => !t.startsWith("pg_") && !t.startsWith("_"));

  if (extras.length > 0) {
    console.log("");
    console.log("Other public tables (informational, not gated):");
    for (const t of extras.sort()) {
      const row = (data ?? []).find((r) => r.tablename === t);
      const rls = row?.rowsecurity ? "enabled" : "disabled";
      const count = policyCount.get(t) ?? 0;
      console.log(`  ${t.padEnd(20)}  ${rls.padEnd(8)}  ${count} policies`);
    }
  }

  console.log("");
  if (failed > 0) {
    console.log(
      `${failed} of ${REQUIRED_TABLES.length} required tables FAILED (RLS disabled or zero policies).`,
    );
    process.exit(1);
  }
  console.log(
    `All ${REQUIRED_TABLES.length} required tables have RLS enabled with at least one policy.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
