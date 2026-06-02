import type { NextConfig } from "next";
import path from "node:path";

const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  } catch {
    return "";
  }
})();

// CSP starts in report-only so we can ship without breaking the app
// while we collect violations. Set CSP_ENFORCE=1 to switch on
// enforcement once the logs are clean.
//
// What each source list covers:
//   default-src 'self'      every fetch / connect / img unless overridden
//   script-src              app code (self), Vercel's edge runtime injects
//                           a tiny inline hydration script per page, so
//                           'unsafe-inline' is required until we add
//                           per-request nonce wiring
//   style-src               Tailwind ships CSS via <style> + linked sheets
//                           (self + inline)
//   img-src                 self + data URLs + the Supabase Storage host
//                           (logo bucket + cached PDFs)
//   connect-src             self + Supabase REST/Storage/Auth + Vercel
//                           speed-insights / analytics
//   font-src                self + Google Fonts (Inter + JetBrains Mono)
//   frame-ancestors 'self'  only our own pages may iframe the app, so
//                           the in-app invoice and PDF viewers work
//                           while other origins still cannot frame us
//   base-uri 'self'         no DOM <base href=...> hijack
//   form-action 'self'      no off-site form posts
//   object-src 'none'       no <object>/<embed>
function csp(): string {
  const supabase = SUPABASE_HOST ? `https://${SUPABASE_HOST}` : "";
  const supabaseWs = SUPABASE_HOST ? `wss://${SUPABASE_HOST}` : "";
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: ${supabase} https://*.vercel-insights.com`,
    `connect-src 'self' ${supabase} ${supabaseWs} https://*.vercel-insights.com https://va.vercel-scripts.com`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `frame-ancestors 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join("; ");
}

const enforceCsp = process.env.CSP_ENFORCE === "1";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The invoice PDF route reads font files from disk at runtime via
  // process.cwd(). Next.js file-tracing can't see those reads, so
  // include them explicitly in the serverless function bundle on
  // Vercel.
  outputFileTracingIncludes: {
    "/api/invoices/*/pdf": ["./public/fonts/**/*"],
    "/api/quotations/*/pdf": ["./public/fonts/**/*"],
  },
  async headers() {
    const cspHeaderName = enforceCsp
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only";
    return [
      {
        source: "/(.*)",
        headers: [
          // HSTS: only meaningful on HTTPS, but harmless on HTTP. Long
          // max-age + includeSubDomains is the standard hardening.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Only our own origin may frame us, so the in-app invoice
          // and PDF viewers render in an iframe. Other origins still
          // cannot. CSP frame-ancestors 'self' is the modern form;
          // this legacy header covers older browsers.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Browser must respect declared content-type, no sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sends path + origin to same-origin, only origin
          // cross-origin. Protects path data on link-outs.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Block legacy / niche browser features the app does not
          // use. Camera / mic / payment APIs stay off.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: cspHeaderName, value: csp() },
        ],
      },
    ];
  },
};

export default nextConfig;
