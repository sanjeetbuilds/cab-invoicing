import "server-only";

/**
 * Per-email failed-sign-in tracker, entirely separate from forgot-password
 * (which must keep working even for a locked-out email) and from the
 * generic per-IP rate limiter in rate-limit.ts. In-memory, per-instance —
 * fine for the "stop a scripted guesser" case this exists for.
 */

interface Entry {
  failures: number;
  firstFailureAt: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const failuresByEmail = new Map<string, Entry>();

function key(email: string): string {
  return email.toLowerCase();
}

export type LockoutStatus =
  | { locked: false }
  | { locked: true; retryInSeconds: number };

export function checkLockout(email: string): LockoutStatus {
  const entry = failuresByEmail.get(key(email));
  if (!entry) return { locked: false };

  const now = Date.now();
  if (now - entry.firstFailureAt > WINDOW_MS) {
    failuresByEmail.delete(key(email));
    return { locked: false };
  }
  if (entry.failures >= MAX_FAILURES) {
    const retryInSeconds = Math.max(
      1,
      Math.ceil((entry.firstFailureAt + WINDOW_MS - now) / 1000),
    );
    return { locked: true, retryInSeconds };
  }
  return { locked: false };
}

export function recordLoginFailure(email: string): void {
  const now = Date.now();
  const k = key(email);
  const entry = failuresByEmail.get(k);
  if (!entry || now - entry.firstFailureAt > WINDOW_MS) {
    failuresByEmail.set(k, { failures: 1, firstFailureAt: now });
    return;
  }
  entry.failures += 1;
}

export function clearLoginFailures(email: string): void {
  failuresByEmail.delete(key(email));
}
