"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordResetAction } from "../actions";

const Schema = z.object({
  email: z.string().email("Enter a valid email address."),
});
type FormValues = z.infer<typeof Schema>;

export function ForgotForm() {
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
      const result = await sendPasswordResetAction(fd);
      if (result.ok) {
        setSentTo(values.email);
      } else {
        toast.error(result.error);
      }
    });
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <MailCheck className="h-10 w-10 text-success" />
        <h2 className="text-lg font-semibold text-foreground">
          Check your email
        </h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for <strong>{sentTo}</strong>, we just sent a
          reset link to it.
        </p>
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
          "Send reset link"
        )}
      </Button>
    </form>
  );
}
