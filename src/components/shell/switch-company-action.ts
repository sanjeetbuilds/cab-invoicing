"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CURRENT_COMPANY_COOKIE } from "@/lib/current-company";

export async function switchCompanyAction(companyId: string): Promise<void> {
  const store = await cookies();
  store.set(CURRENT_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
