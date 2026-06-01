import "server-only";

import { headers } from "next/headers";

/**
 * Per-IP, per-action sliding-window rate limiter. Keeps counts in
 * process memory, which is per-instance on Vercel, but the warm
 * instance traps the typical "one bot hammers the form" case which is
 * what these limits exist for. Swap the store for Upstash Redis when
 * we need cross-instance correctness.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Best-effort IP. Vercel sets x-forwarded-for + x-real-ip; behind any
// other proxy the same headers apply. Falls back to "unknown" so we
// still bucket attacks from one unidentifiable source together.
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export interface RateLimitOk {
  ok: true;
}
export interface RateLimitBlocked {
  ok: false;
  retryInSeconds: number;
  /** Plain-English message ready to surface in the UI. */
  message: string;
}

export async function rateLimit(args: {
  action: string;
  limit: number;
  windowMs: number;
  /** Optional override for the user-facing message. */
  message?: (retryInSeconds: number) => string;
}): Promise<RateLimitOk | RateLimitBlocked> {
  const ip = await clientIp();
  const key = `${args.action}:${ip}`;
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + args.windowMs });
    return { ok: true };
  }

  if (bucket.count >= args.limit) {
    const retryInSeconds = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000),
    );
    const message = args.message
      ? args.message(retryInSeconds)
      : `Too many tries. Please wait ${retryInSeconds} seconds and try again.`;
    return { ok: false, retryInSeconds, message };
  }

  bucket.count += 1;
  return { ok: true };
}
