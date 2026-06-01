import "server-only";

import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS. Use ONLY in trusted server contexts
// (Route Handlers, Server Actions). `import "server-only"` ensures the
// bundler errors out if anything in the client graph reaches this file
// (which would leak the service-role key into the browser bundle).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
