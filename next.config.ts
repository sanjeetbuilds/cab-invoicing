import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The invoice PDF route reads font files from disk at runtime via
  // process.cwd(). Next.js file-tracing can't see those reads, so include
  // them explicitly in the serverless function bundle on Vercel.
  outputFileTracingIncludes: {
    "/api/invoices/*/pdf": ["./public/fonts/**/*"],
    "/api/quotations/*/pdf": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
