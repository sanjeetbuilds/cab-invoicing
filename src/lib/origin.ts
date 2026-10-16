import "server-only";
import { headers } from "next/headers";

/** The current request's origin, for building absolute links (email links,
 *  auth redirects) from inside a Server Action. */
export async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
