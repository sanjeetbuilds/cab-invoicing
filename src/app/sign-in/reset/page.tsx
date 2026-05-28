import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Set new password — Krishna Cabs" };

export default async function ResetPasswordPage() {
  // The /auth/callback exchanged the code in the email for a session, then
  // redirected here. If there's no session, the link expired or was opened
  // on a different device — kick them back to start.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in?error=The+reset+link+expired.+Request+a+new+one.");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription>
            Pick a password at least 8 characters long. You&apos;ll stay
            signed in after this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetForm />
        </CardContent>
      </Card>
    </div>
  );
}
