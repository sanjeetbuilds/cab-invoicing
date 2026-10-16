"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supportWhatsAppLink } from "@/lib/platform-config";
import { signInAction, resendConfirmationAction, type AuthFailReason } from "./actions";

const SignInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
type SignInValues = z.infer<typeof SignInSchema>;

interface FormFail {
  reason?: AuthFailReason;
  message: string;
  email?: string;
}

// Displayed as "Resend in 0:59" counting down to "0:00" — 60 seconds total.
const RESEND_COOLDOWN_SECONDS = 59;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const initialError = searchParams.get("error");
  const [pending, startTransition] = useTransition();
  const [fail, setFail] = useState<FormFail | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, startResend] = useTransition();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });
  // Computed manually rather than destructuring formState.isValid —
  // matches the convention the rest of the app's forms use (isDirty
  // instead), which also sidesteps a React Compiler ref-safety warning
  // specific to isValid's internal getter.
  const [watchedEmail, watchedPassword] = watch(["email", "password"]);
  const isValid = SignInSchema.safeParse({ email: watchedEmail, password: watchedPassword }).success;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function onSubmit(values: SignInValues) {
    setFail(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", values.email);
      fd.set("password", values.password);
      fd.set("next", next);
      const result = await signInAction(fd);
      if (result.ok) {
        router.push(result.next);
      } else {
        setFail({ reason: result.reason, message: result.error, email: result.email });
        if (result.reason === "unverified") startCooldown();
      }
    });
  }

  function onResend() {
    if (!fail?.email || cooldown > 0) return;
    startResend(async () => {
      const result = await resendConfirmationAction(fail.email!);
      if (result.ok) {
        toast.success(`A new link was sent to ${fail.email}.`);
        startCooldown();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {initialError && (
        <p className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {initialError}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
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

        {fail && (
          <div className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
            <p>{fail.message}</p>
            {(fail.reason === "unregistered" || fail.reason === "expired") && (
              <a
                href={supportWhatsAppLink("Hi, I need access to Cab Invoicing.")}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-medium underline"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Contact us
              </a>
            )}
            {fail.reason === "unverified" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={cooldown > 0 || resending}
                onClick={onResend}
              >
                {resending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : cooldown > 0 ? (
                  `Resend in 0:${String(cooldown).padStart(2, "0")}`
                ) : (
                  "Resend link"
                )}
              </Button>
            )}
          </div>
        )}

        <Button type="submit" disabled={pending || !isValid} className="w-full">
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
    </div>
  );
}
