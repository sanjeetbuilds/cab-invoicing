"use client";

import { useEffect, useState } from "react";

/**
 * True when the viewport is below the Tailwind `md` breakpoint (768px).
 * Used to flip between mobile patterns (bottom-sheet, full-width
 * action row) and their desktop counterparts (popover, sidebar).
 *
 * SSR returns `false` for stable hydration; the actual value is
 * resolved on the client after mount.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}
