"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary. Next.js renders this when the ROOT
 * layout itself throws, so the route-level error.tsx never gets the
 * chance. It must include its own <html> and <body> tags because the
 * normal layout chain is unavailable, and it must avoid the design
 * system (Tailwind classes are fine; complex client components might
 * not be safe to mount when the layout is broken).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the underlying problem in the console / function logs
    // so it remains debuggable even though the user only sees the
    // friendly card.
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          color: "#111827",
          background: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <div
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "9999px",
              background: "rgba(220, 38, 38, 0.14)",
              color: "#dc2626",
              fontSize: "22px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            !
          </div>
          <h1
            style={{
              fontSize: "16px",
              fontWeight: 600,
              margin: 0,
              color: "#111827",
            }}
          >
            Something went wrong.
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              marginTop: "8px",
              marginBottom: "20px",
            }}
          >
            Please reload the page. If it keeps happening, sign in again from
            the home page.
          </p>
          <div
            style={{
              display: "flex",
              gap: "8px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                appearance: "none",
                border: "none",
                cursor: "pointer",
                height: "36px",
                padding: "0 16px",
                borderRadius: "8px",
                background: "#4f46e5",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "36px",
                padding: "0 16px",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#111827",
                border: "1px solid #e5e7eb",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Go to home page
            </a>
          </div>
          {error.digest && (
            <p
              style={{
                marginTop: "16px",
                fontSize: "11px",
                color: "#9ca3af",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
