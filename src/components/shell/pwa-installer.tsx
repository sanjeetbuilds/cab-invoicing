"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

// Stash the deferred event so we can fire it from a button click.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VISIT_KEY = "eb.pwa.visits";
const DISMISS_KEY = "eb.pwa.dismissed_at";
const DISMISS_DAYS = 10;

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari adds this non-standard flag.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const at = Number(ts);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function visitCount(): number {
  try {
    return Number(localStorage.getItem(VISIT_KEY) ?? "0");
  } catch {
    return 0;
  }
}

function bumpVisits(): number {
  try {
    const next = visitCount() + 1;
    localStorage.setItem(VISIT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

/**
 * Registers the service worker and surfaces a small install prompt the
 * third time the user opens the app, only on real browsers, never
 * inside the installed PWA, and dismissable for 10 days.
 *
 * Android / desktop Chrome / Edge → uses the standard beforeinstallprompt
 * event. iOS Safari has no programmatic install, so we show a one-liner
 * pointing at the share sheet instead.
 */
export function PwaInstaller() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosHint, setShowIosHint] = useState(false);
  const [eligible, setEligible] = useState(false);

  // Register the service worker once. Failures are non-fatal, the app
  // works fine without it; the SW just speeds up repeat visits.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => {
        console.warn("[pwa] service worker registration failed", err);
      });
  }, []);

  // Eligibility: bump the visit counter, suppress if dismissed or
  // already standalone, then arm the prompt rules.
  useEffect(() => {
    if (isStandalone()) return;
    if (isDismissed()) return;
    const visits = bumpVisits();
    if (visits < 3) return;
    setEligible(true);
    if (isIos()) {
      setShowIosHint(true);
    }
  }, []);

  // Android / Chrome / Edge install, catch the deferred event so we
  // can re-trigger the prompt from our own button.
  useEffect(() => {
    function onBefore(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBefore);
    return () => window.removeEventListener("beforeinstallprompt", onBefore);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // private mode etc, best effort
    }
    setDeferred(null);
    setShowIosHint(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      try {
        localStorage.removeItem(VISIT_KEY);
      } catch {
        // ignore
      }
    } else {
      dismiss();
    }
    setDeferred(null);
  }

  // ────────── Render ──────────
  // Non-iOS install banner: needs the deferred event in hand.
  if (eligible && deferred && !isIos()) {
    return (
      <div className="fixed bottom-16 inset-x-3 z-30 lg:bottom-3 lg:left-auto lg:right-3 lg:max-w-sm">
        <div className="rounded-lg border border-border bg-card shadow-card px-3 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">
              Install EasyBills
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              Faster access from your home screen.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={install}
            className="shrink-0"
          >
            <Download className="h-4 w-4" />
            Install
          </Button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS hint: no programmatic install; nudge the user toward the
  // share sheet.
  if (eligible && showIosHint) {
    return (
      <div className="fixed bottom-16 inset-x-3 z-30">
        <div className="rounded-lg border border-border bg-card shadow-card px-3 py-3 flex items-start gap-3">
          <Share2 className="h-5 w-5 text-primary shrink-0 mt-1" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">
              Install EasyBills
            </p>
            <p className="text-xs text-muted-foreground leading-snug mt-1">
              Tap the <span className="font-medium">Share</span> button in
              Safari, then{" "}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install hint"
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
