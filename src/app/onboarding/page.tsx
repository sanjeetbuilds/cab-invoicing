import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata = {
  title: "Create your company — Krishna Cabs",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // If user is already a member of a company, jump to dashboard.
  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  if (existing && existing.length > 0) redirect("/");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Create your company</CardTitle>
          <CardDescription>
            This is your tenant. Everything you add (clients, trips, invoices)
            lives under it. You can invite teammates later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm defaultEmail={user.email ?? undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
