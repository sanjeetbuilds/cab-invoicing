import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { SUPPORT_CONTACT } from "@/lib/platform-config";
import { plainSupportMailto } from "@/lib/support-mailto";

export const metadata = {
  title: "No company yet",
};

/**
 * Companies are now created only by a platform super-admin (invite-only
 * SaaS), never self-serve, and every account is created with a membership
 * already attached. A signed-in user only ever lands here if their last
 * membership was later removed — there's nothing for them to do but
 * reach out.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  if (existing && existing.length > 0) redirect("/");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">No company yet</CardTitle>
          <CardDescription>
            Your account isn&apos;t attached to a company. Companies are set
            up by us, not self-serve — contact {SUPPORT_CONTACT} to get
            access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href={plainSupportMailto()}
            className="text-sm font-medium text-primary hover:text-primary-hover underline"
          >
            Email {SUPPORT_CONTACT}
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
