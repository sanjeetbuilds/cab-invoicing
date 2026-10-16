import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { SetPasswordForm } from "./set-password-form";

export const metadata = {
  title: "Set your password",
};

function firstNameFor(email: string, memberName: string | null): string {
  if (memberName && memberName.trim()) return memberName.trim().split(/\s+/)[0];
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default async function SetPasswordPage() {
  const { supabase, user } = await requireUser();

  const meta = (user.user_metadata ?? {}) as { must_change_password?: boolean };
  if (!meta.must_change_password) redirect("/");

  const { data: membership } = await supabase
    .from("memberships")
    .select("member_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ member_name: string | null }>();

  const firstName = firstNameFor(user.email ?? "", membership?.member_name ?? null);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome, {firstName}</CardTitle>
          <CardDescription>Set a new password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
