"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiny first-run tour. Tells the user, in five steps, how to reach
 * their first invoice. A small overlay with a spotlight on the
 * target element, an info bubble, and Back / Next / Skip controls.
 *
 * Autoplay advances every 6 seconds. Hover or tap on the overlay
 * pauses the timer; clicking Next or Back stops autoplay for the
 * rest of the session. prefers-reduced-motion turns autoplay off
 * entirely so steps only advance on a click.
 */

export interface TourStep {
  /**
   * CSS selector for the element the step should point at. Falls
   * back to a centered card when null or when the selector matches
   * nothing on this viewport.
   */
  selector: string | null;
  title: string;
  body: string;
  /** Where to place the bubble relative to the target. */
  placement?: "bottom" | "top" | "right" | "left" | "center";
}

const AUTOPLAY_MS = 6000;
const BUBBLE_GAP = 12;
const SPOTLIGHT_PADDING = 8;

export function Tour({
  steps,
  onComplete,
}: {
  steps: TourStep[];
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  const step = steps[index];
  // Sidebar steps default to "right" but the same data-tour key
  // matches a bottom-nav tab on mobile, flip to "top" there so the
  // bubble sits above the tab instead of off-screen to the side.
  const isNarrow = viewport.w < 768;
  let placement = step?.placement ?? "bottom";
  if (isNarrow && (placement === "right" || placement === "left")) {
    placement = "top";
  }
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  // Detect prefers-reduced-motion and react to live changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Resolve the target rect for the current step. Re-measures on
  // window resize and on scroll so the spotlight tracks the target.
  useEffect(() => {
    if (!step?.selector) {
      setTargetRect(null);
      return;
    }
    function update() {
      if (!step?.selector) {
        setTargetRect(null);
        return;
      }
      // The sidebar nav and the bottom-nav share data-tour keys so
      // both desktop and mobile can be anchored. The hidden one has
      // a zero rect; pick the first visible match instead.
      const nodes = document.querySelectorAll(step.selector);
      let chosen: DOMRect | null = null;
      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        const r = node.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          chosen = r;
          break;
        }
      }
      setTargetRect(chosen);
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    }
    update();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(update)
        : null;
    if (ro && step.selector) {
      const el = document.querySelector(step.selector);
      if (el instanceof HTMLElement) ro.observe(el);
    }
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      ro?.disconnect();
    };
  }, [step]);

  // Autoplay. Disabled outright under prefers-reduced-motion and
  // whenever the user pauses (hover / tap) or clicks a control.
  useEffect(() => {
    if (reducedMotion || !autoplay || paused) return;
    const id = window.setTimeout(() => {
      if (index < steps.length - 1) setIndex((i) => i + 1);
      else onComplete();
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [index, autoplay, paused, reducedMotion, steps.length, onComplete]);

  // Esc / arrow key controls.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onComplete();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handleBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, steps.length]);

  function handleNext() {
    setAutoplay(false);
    if (index < steps.length - 1) setIndex((i) => i + 1);
    else onComplete();
  }
  function handleBack() {
    setAutoplay(false);
    if (index > 0) setIndex((i) => i - 1);
  }
  function handleSkip() {
    onComplete();
  }

  if (!step) return null;

  // Pause autoplay while the cursor / finger is on the overlay so a
  // user reading the bubble doesn't get rushed.
  const pauseHandlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onTouchStart: () => setPaused(true),
    onTouchEnd: () => setPaused(false),
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      className="fixed inset-0 z-[100]"
      {...pauseHandlers}
    >
      {targetRect ? (
        <Spotlight rect={targetRect} />
      ) : (
        <div className="absolute inset-0 bg-black/40" aria-hidden />
      )}

      <Bubble
        step={step}
        targetRect={targetRect}
        viewport={viewport}
        placement={placement}
        stepIndex={index}
        total={steps.length}
        isFirst={isFirst}
        isLast={isLast}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
      />
    </div>
  );
}

function Spotlight({ rect }: { rect: DOMRect }) {
  // The "spotlight" is just a transparent rounded box positioned over
  // the target. A huge box-shadow spread paints everything else with
  // a dim wash, leaving the target visually highlighted without any
  // clip-path gymnastics.
  return (
    <div
      aria-hidden
      className="absolute rounded-lg pointer-events-none transition-all duration-200"
      style={{
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
      }}
    />
  );
}

function Bubble({
  step,
  targetRect,
  viewport,
  placement,
  stepIndex,
  total,
  isFirst,
  isLast,
  onNext,
  onBack,
  onSkip,
}: {
  step: TourStep;
  targetRect: DOMRect | null;
  viewport: { w: number; h: number };
  placement: "bottom" | "top" | "right" | "left" | "center";
  stepIndex: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Best-effort positioning. When the bubble would land off-screen
  // (e.g. anchor near the bottom of the viewport pointing "below"),
  // we flip to the other side.
  const pos = computeBubblePosition(
    targetRect,
    viewport,
    placement,
    ref.current?.offsetWidth ?? 320,
    ref.current?.offsetHeight ?? 180,
  );

  return (
    <div
      ref={ref}
      className={cn(
        "absolute w-[min(360px,calc(100vw-32px))] rounded-xl bg-card shadow-card-hover",
        "p-5 flex flex-col gap-3",
      )}
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          Step {stepIndex + 1} of {total}
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </div>

      <div>
        <h2
          id="tour-step-title"
          className="text-base font-semibold text-foreground"
        >
          {step.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{step.body}</p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirst}
          className={cn(
            "h-9 px-3 rounded-md text-sm font-medium",
            isFirst
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-foreground hover:bg-muted",
          )}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover"
        >
          {isLast ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}

function computeBubblePosition(
  target: DOMRect | null,
  viewport: { w: number; h: number },
  placement: "bottom" | "top" | "right" | "left" | "center",
  bubbleW: number,
  bubbleH: number,
): { top: number; left: number } {
  // Centered fallback when there's no anchor or the anchor selector
  // didn't resolve to an element on this viewport.
  if (!target || placement === "center") {
    return {
      top: Math.max(16, (viewport.h - bubbleH) / 2),
      left: Math.max(16, (viewport.w - bubbleW) / 2),
    };
  }

  let top = 0;
  let left = 0;

  if (placement === "bottom") {
    top = target.bottom + BUBBLE_GAP;
    left = target.left + target.width / 2 - bubbleW / 2;
  } else if (placement === "top") {
    top = target.top - BUBBLE_GAP - bubbleH;
    left = target.left + target.width / 2 - bubbleW / 2;
  } else if (placement === "right") {
    top = target.top + target.height / 2 - bubbleH / 2;
    left = target.right + BUBBLE_GAP;
  } else {
    // left
    top = target.top + target.height / 2 - bubbleH / 2;
    left = target.left - BUBBLE_GAP - bubbleW;
  }

  // Flip vertically if "bottom" would overflow the viewport, etc.
  if (top + bubbleH > viewport.h - 16) {
    top = Math.max(16, target.top - BUBBLE_GAP - bubbleH);
  }
  if (top < 16) top = 16;

  // Clamp horizontally so the bubble stays within the viewport with
  // a 16 px margin.
  left = Math.max(16, Math.min(left, viewport.w - bubbleW - 16));

  return { top, left };
}
