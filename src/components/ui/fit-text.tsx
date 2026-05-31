"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shrinks a single line of text to fit its container. Renders at
 * `maxPx` initially (SSR-safe — server output matches the max size),
 * then runs a layout pass on mount + resize: if the rendered width
 * exceeds the parent's content width, font-size is decremented by 1px
 * until it fits or hits `minPx`. Below `minPx` the text wraps.
 *
 * Used by dashboard stat tiles so a small amount displays at the
 * comfortable 24px, while ₹12,34,567.00-class numbers shrink instead
 * of bleeding outside the tile.
 */
export function FitText({
  text,
  maxPx,
  minPx = 16,
  className,
}: {
  text: string;
  maxPx: number;
  minPx?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(maxPx);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    function fit() {
      if (!el || !parent) return;
      let s = maxPx;
      el.style.fontSize = `${s}px`;
      // scrollWidth reflects the natural text width even when the
      // parent clips overflow. Shrink by 1px per step until it fits.
      while (s > minPx && el.scrollWidth > parent.clientWidth) {
        s -= 1;
        el.style.fontSize = `${s}px`;
      }
      setSize(s);
    }

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [text, maxPx, minPx]);

  return (
    <span
      ref={ref}
      style={{
        fontSize: `${size}px`,
        // 1.0 was clipping the ascender on the ₹ glyph (its top sits
        // above the em-box in most mono fonts) once the parent set
        // overflow-hidden. 1.15 gives every glyph room to breathe
        // without throwing off the tile's vertical rhythm.
        lineHeight: 1.15,
        display: "inline-block",
        whiteSpace: size > minPx ? "nowrap" : "normal",
      }}
      className={className}
    >
      {text}
    </span>
  );
}
