import "server-only";
import { cookies } from "next/headers";

/** Which of a multi-company user's memberships they're currently viewing. */
export const CURRENT_COMPANY_COOKIE = "current_company_id";

export async function getSelectedCompanyId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CURRENT_COMPANY_COOKIE)?.value ?? null;
}
