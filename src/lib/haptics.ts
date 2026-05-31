/**
 * Tiny haptic helpers. Wrapped in feature checks so they're safe to
 * call on every platform, iOS Safari ignores the Vibration API
 * silently (Apple's policy), Android Chrome buzzes briefly. On desktop
 * these are no-ops.
 *
 * The intent is to bind these to genuinely consequential moments, a
 * successful save, a destructive confirm, a primary CTA, not routine
 * navigation, focus changes, or scroll. The user should feel that the
 * device acknowledged an action; over-vibration becomes noise.
 */

function safeVibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // some browsers throw if a vibration is already running
  }
}

/** A short tap, primary CTAs, confirm dialog confirms. */
export function hapticTap(): void {
  safeVibrate(10);
}

/** A slightly longer pulse, successful save / issue / accept. */
export function hapticSuccess(): void {
  safeVibrate(20);
}

/** A short triple, destructive action committed (delete, reverse). */
export function hapticDestructive(): void {
  safeVibrate([15, 30, 15]);
}
