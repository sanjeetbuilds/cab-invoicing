"use client";

import { useEffect, useState } from "react";
import { Tour, type TourStep } from "./tour";

/**
 * Boots the first-run tour exactly once per browser, and listens for
 * a "replay" custom event so the Settings page can re-show it on
 * demand. Persistence is in localStorage (no schema change).
 */

const STORAGE_KEY = "easybills_tour_seen_v1";
export const REPLAY_EVENT = "easybills:replay-tour";

const STEPS: TourStep[] = [
  {
    selector: null,
    placement: "center",
    title: "Welcome to EasyBills.",
    body:
      "Here is how to make your first bill in a few steps. Use Skip if you want to explore on your own.",
  },
  {
    selector: "[data-tour='setup-checklist']",
    placement: "bottom",
    title: "Start here.",
    body: "This list shows the steps to your first invoice. Tick them off one by one.",
  },
  {
    selector: "[data-tour='nav-clients']",
    placement: "right",
    title: "Add the companies you bill here.",
    body: "Each client gets its own rate card, so you can charge different prices to different clients.",
  },
  {
    selector: "[data-tour='nav-bulk-import']",
    placement: "right",
    title: "Have a lot of data?",
    body: "Bring it all in from Excel in one go. We will check it before saving anything.",
  },
  {
    selector: "[data-tour='nav-invoices']",
    placement: "right",
    title: "Make your bill here.",
    body: "When your trips are added, make your monthly invoice in a few clicks.",
  },
];

export function TourLauncher() {
  const [open, setOpen] = useState(false);

  // Mount-only: start the tour if the user has not seen it yet.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // localStorage blocked (private mode etc.), just show the tour.
      setOpen(true);
    }
  }, []);

  // Settings page dispatches this event to replay.
  useEffect(() => {
    function onReplay() {
      setOpen(true);
    }
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, []);

  function handleComplete() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;
  return <Tour steps={STEPS} onComplete={handleComplete} />;
}
