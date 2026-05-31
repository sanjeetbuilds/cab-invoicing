import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign out via either GET (Link clicks from sidebar / More drawer) or
 * POST (fetch from the user-menu dropdown). Both clear the Supabase
 * session and bounce to the marketing landing — that page has clear
 * "Sign in" / "Try for free" CTAs so the user has an obvious next
 * step.
 */
async function handle(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

export const GET = handle;
export const POST = handle;
