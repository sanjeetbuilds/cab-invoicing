"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { INDIA_STATES } from "@/lib/india-states";
import { generateTempPassword } from "@/lib/temp-password";
import { buildLoginDetailsText } from "@/lib/login-details-text";
import { createCompanyAction, type CreateCompanyResult } from "../actions";

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const Schema = z.object({
  name: z.string().trim().min(2, "Enter company name (2–80 characters)").max(80, "Enter company name (2–80 characters)"),
  state: z.string().min(1, "Pick the company's state."),
  ownerName: z
    .string()
    .trim()
    .min(2, "Enter owner's name — letters only")
    .max(60, "Enter owner's name — letters only")
    .regex(/^[A-Za-z ]+$/, "Enter owner's name — letters only"),
  ownerEmail: z.string().trim().email("Enter a valid email"),
  ownerMobile: z
    .union([z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"), z.literal("")])
    .optional(),
  internalNote: z.string().trim().max(300, "Keep it under 300 characters.").optional(),
  tempPassword: z.string().regex(PASSWORD_RE, "Password must have 8+ characters, a letter and a number."),
});
type FormValues = z.infer<typeof Schema>;

export function CreateCompanyForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [duplicateConfirm, setDuplicateConfirm] = useState<FormValues | null>(null);
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const [success, setSuccess] = useState<CreateCompanyResult | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      state: "",
      ownerName: "",
      ownerEmail: "",
      ownerMobile: "",
      internalNote: "",
      tempPassword: generateTempPassword(),
    },
  });
  const state = watch("state");
  const tempPassword = watch("tempPassword");

  function regeneratePassword() {
    setValue("tempPassword", generateTempPassword(), { shouldValidate: true, shouldDirty: true });
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(tempPassword);
    toast.success("Password copied");
  }

  function submit(values: FormValues, confirmDuplicate: boolean) {
    startTransition(async () => {
      const result = await createCompanyAction({ ...values, confirmDuplicate });
      if (result.needsDuplicateConfirm) {
        setDuplicateConfirm(values);
        return;
      }
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      if (result.outcome === "added_existing") {
        toast.success(
          `${result.ownerName} already has an account — added as owner of ${result.companyName}`,
        );
      } else if (result.emailSent) {
        toast.success(`Account created, email sent to ${result.ownerEmail}`);
      } else {
        toast.error("Couldn't send the email. Copy the login details and share them on WhatsApp.");
      }
      setSuccess(result);
    });
  }

  function onSubmit(values: FormValues) {
    submit(values, false);
  }

  function onCancel() {
    if (isDirty) {
      setDiscardConfirm(true);
    } else {
      router.push("/admin");
    }
  }

  async function copyLoginDetails() {
    if (!success?.companyName || !success.ownerEmail || !success.tempPassword || !success.appUrl) return;
    const text = buildLoginDetailsText({
      company: success.companyName,
      appUrl: success.appUrl,
      email: success.ownerEmail,
      password: success.tempPassword,
    });
    await navigator.clipboard.writeText(text);
    toast.success("Login details copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (success) {
    return (
      <Card className="border-success/30 bg-success-soft">
        <CardContent className="flex flex-col gap-3 py-6">
          <p className="text-sm font-semibold text-foreground">
            Account created for {success.companyName}
          </p>

          {success.outcome === "created" && success.tempPassword && success.appUrl ? (
            <>
              <div className="rounded-lg border border-border bg-card p-3 text-sm flex flex-col gap-1">
                <p>
                  Login: <span className="font-mono">{success.appUrl}</span>
                </p>
                <p>
                  Email: <span className="font-mono">{success.ownerEmail}</span>
                </p>
                <p>
                  Temporary password: <span className="font-mono font-semibold">{success.tempPassword}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {success.emailSent
                  ? `Email sent to ${success.ownerEmail}`
                  : "Email couldn't be sent. Copy the details and share them on WhatsApp."}
              </p>
              <Button size="sm" variant="outline" className="self-start" onClick={copyLoginDetails}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy login details"}
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {success.ownerName} already had an account — added as owner of {success.companyName}.{" "}
              {success.emailSent
                ? `An email was sent to ${success.ownerEmail}.`
                : "Couldn't send the email, but they can sign in with their existing password."}
            </p>
          )}

          <Button variant="outline" className="self-start" onClick={() => router.push("/admin")}>
            Back to companies
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="nc-name">Company name</Label>
                <Input id="nc-name" placeholder="Acme Cabs" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="nc-state">State</Label>
                <Select
                  value={state || undefined}
                  onValueChange={(v) => {
                    if (typeof v === "string") setValue("state", v, { shouldValidate: true, shouldDirty: true });
                  }}
                >
                  <SelectTrigger id="nc-state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIA_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="nc-owner-name">Owner name</Label>
                <Input id="nc-owner-name" placeholder="Jane Doe" {...register("ownerName")} />
                {errors.ownerName && (
                  <p className="text-sm text-destructive">{errors.ownerName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="nc-owner-email">Owner email</Label>
                <Input
                  id="nc-owner-email"
                  type="email"
                  inputMode="email"
                  placeholder="owner@example.com"
                  {...register("ownerEmail")}
                />
                {errors.ownerEmail && (
                  <p className="text-sm text-destructive">{errors.ownerEmail.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="nc-owner-mobile">Owner mobile (optional)</Label>
                <Input
                  id="nc-owner-mobile"
                  inputMode="numeric"
                  placeholder="9876543210"
                  {...register("ownerMobile")}
                />
                {errors.ownerMobile && (
                  <p className="text-sm text-destructive">{errors.ownerMobile.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="nc-password">Temporary password</Label>
                <div className="flex items-center gap-2">
                  <Input id="nc-password" readOnly className="font-mono" {...register("tempPassword")} />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={regeneratePassword}
                    aria-label="Regenerate password"
                    title="Regenerate password"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={copyPassword}
                    aria-label="Copy password"
                    title="Copy password"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {errors.tempPassword && (
                  <p className="text-sm text-destructive">{errors.tempPassword.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Only used if this email doesn&apos;t already have an account. Shown here once —
                  it&apos;s never stored or shown again after this screen.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="nc-note">Internal note (optional, admin-only)</Label>
                <Textarea
                  id="nc-note"
                  rows={3}
                  placeholder="Not shown to the company."
                  {...register("internalNote")}
                />
                {errors.internalNote && (
                  <p className="text-sm text-destructive">{errors.internalNote.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={pending || !isValid}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create account &amp; send email
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog
        open={duplicateConfirm != null}
        onOpenChange={(o) => {
          if (!o) setDuplicateConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Company name already exists</AlertDialogTitle>
            <AlertDialogDescription>
              A company named &apos;{duplicateConfirm?.name}&apos; already exists. Create anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (duplicateConfirm) submit(duplicateConfirm, true);
                setDuplicateConfirm(null);
              }}
            >
              Create anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={discardConfirm} onOpenChange={setDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this company?</AlertDialogTitle>
            <AlertDialogDescription>
              Details you entered will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/admin")}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
