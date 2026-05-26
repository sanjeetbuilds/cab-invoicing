"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink } from "./actions";

const Schema = z.object({
  email: z.string().email("Enter a valid email address."),
});
type FormValues = z.infer<typeof Schema>;

export function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", values.email);
      if (next) fd.set("next", next);
      const result = await sendMagicLink(fd);
      if (result.ok) {
        setSentTo(result.email);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <Mail className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <strong>{sentTo}</strong>.
          <br />
          Open it on this device to continue.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mx-auto mt-2"
          onClick={() => setSentTo(null)}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
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
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send magic link"
        )}
      </Button>
    </form>
  );
}
