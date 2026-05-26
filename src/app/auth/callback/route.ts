import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") ?? "/";
  const errorDescription = url.searchParams.get("error_description");

  if (errorDescription) {
    const back = new URL("/sign-in", url.origin);
    back.searchParams.set("error", errorDescription);
    return NextResponse.redirect(back);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const back = new URL("/sign-in", url.origin);
    back.searchParams.set("error", error.message);
    return NextResponse.redirect(back);
  }

  // Avoid open-redirect: only allow same-origin paths.
  const safeNext = nextPath.startsWith("/") ? nextPath : "/";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
