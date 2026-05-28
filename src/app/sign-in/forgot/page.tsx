import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            We&apos;ll email you a link to set a new password. Note: our
            outbound email is rate-limited, so this is best used sparingly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotForm />
          <p className="mt-4 text-center text-sm">
            <Link
              href="/sign-in"
              className="font-medium text-primary hover:text-primary-hover"
            >
              ← Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
