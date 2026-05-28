import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "Sign in — Krishna Cabs",
};

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Krishna Cabs</CardTitle>
          <CardDescription>
            Sign in with your email and password, or create a new account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <SignInForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
