#!/usr/bin/env node
/**
 * Route smoke test. Hits every main app route and fails the run on
 * any 5xx, so request-time errors (RSC serialization, server
 * component throws) get caught before users do.
 *
 * Usage:
 *   node scripts/smoke.mjs [baseUrl]
 *
 * Examples:
 *   node scripts/smoke.mjs                            # http://localhost:3000
 *   node scripts/smoke.mjs http://localhost:3001
 *   node scripts/smoke.mjs https://easybills.example.app
 *
 * Auth: set SMOKE_COOKIE to a signed-in session cookie if you want
 * each (app) route to actually render its server component instead
 * of bouncing to /sign-in (which is itself a perfectly fine page,
 * just not the one you wanted to test):
 *
 *   $env:SMOKE_COOKIE = (the value of your sb-...-auth-token cookie)
 *   node scripts/smoke.mjs https://easybills.example.app
 */

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");
const cookie = process.env.SMOKE_COOKIE || "";

const ROUTES = [
  "/",
  "/dashboard",
  "/trips",
  "/invoices",
  "/clients",
  "/quotations",
  "/rate-cards",
  "/vehicles",
  "/bulk-import",
  "/settings",
];

const headers = cookie ? { cookie } : {};

let failed = 0;
let redirected = 0;

console.log(`Smoke check against ${baseUrl}`);
console.log(cookie ? "Using SMOKE_COOKIE for auth." : "No SMOKE_COOKIE set, (app) routes will redirect to /sign-in.");
console.log("");

for (const route of ROUTES) {
  const url = `${baseUrl}${route}`;
  const t0 = Date.now();
  let status = 0;
  let location = "";
  let error = "";
  try {
    const res = await fetch(url, { redirect: "manual", headers });
    status = res.status;
    location = res.headers.get("location") || "";
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const ms = Date.now() - t0;

  if (error) {
    console.log(`FAIL  ${route}  (${ms} ms)  network: ${error}`);
    failed++;
    continue;
  }

  if (status >= 500) {
    console.log(`FAIL  ${status}  ${route}  (${ms} ms)`);
    failed++;
  } else if (status >= 300 && status < 400) {
    redirected++;
    const where = location ? ` -> ${location}` : "";
    console.log(`OK    ${status}  ${route}  (${ms} ms)${where}`);
  } else if (status >= 200 && status < 300) {
    console.log(`OK    ${status}  ${route}  (${ms} ms)`);
  } else {
    console.log(`FAIL  ${status}  ${route}  (${ms} ms)`);
    failed++;
  }
}

console.log("");
console.log(
  `${ROUTES.length} routes checked, ${failed} failed${
    redirected > 0 ? `, ${redirected} redirected (set SMOKE_COOKIE to render)` : ""
  }.`,
);

process.exit(failed > 0 ? 1 : 0);
