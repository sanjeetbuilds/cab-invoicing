import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST-only on purpose. GET would be prefetched by Next.js Link
 * components rendered in the layout (sidebar / More drawer), silently
 * signing the user out on every layout mount. All sign-out entry
 * points use a <form method="POST"> button or fetch POST.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
