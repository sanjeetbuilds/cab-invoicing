"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signInAction, signUpAction } from "./actions";

const SignInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const SignUpSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type SignInValues = z.infer<typeof SignInSchema>;
type SignUpValues = z.infer<typeof SignUpSchema>;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const initialError = searchParams.get("error");
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        if (typeof v === "string" && (v === "signin" || v === "signup")) {
          setTab(v);
        }
      }}
    >
      <TabsList className="w-full">
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="signup">Create account</TabsTrigger>
      </TabsList>

      {initialError && (
        <p className="mt-3 rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {initialError}
        </p>
      )}

      <TabsContent value="signin" className="pt-4">
        <SignInPanel next={next} onSuccess={(to) => router.push(to)} />
      </TabsContent>
      <TabsContent value="signup" className="pt-4">
        <SignUpPanel next={next} onSuccess={(to) => router.push(to)} />
      </TabsContent>
    </Tabs>
  );
}

function SignInPanel({
  next,
  onSuccess,
}: {
  next: string;
  onSuccess: (to: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: SignInValues) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", values.email);
      fd.set("password", values.password);
      fd.set("next", next);
      const result = await signInAction(fd);
      if (result.ok) {
        onSuccess(result.next);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          autoFocus
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <Link
            href="/sign-in/forgot"
            className="text-xs font-medium text-primary hover:text-primary-hover"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

function SignUpPanel({
  next,
  onSuccess,
}: {
  next: string;
  onSuccess: (to: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: SignUpValues) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", values.email);
      fd.set("password", values.password);
      fd.set("next", next);
      const result = await signUpAction(fd);
      if (result.ok) {
        toast.success("Account created. Welcome!");
        onSuccess(result.next);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          autoFocus
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        If your account was invited by a teammate, sign up here with the same
        email and you&apos;ll be added to their company automatically.
      </p>
    </form>
  );
}
