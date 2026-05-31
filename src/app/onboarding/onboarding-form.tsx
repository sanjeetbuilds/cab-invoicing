"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDIA_STATES } from "@/lib/india-states";
import { createCompany } from "./actions";

const Schema = z.object({
  name: z.string().min(1, "Company name is required."),
  state: z.string().min(1, "Pick your registered state."),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal("")).optional(),
  gstin: z.string().optional(),
  invoice_prefix: z.string().optional(),
  next_invoice_number: z
    .number({ message: "Enter a number." })
    .int()
    .min(1, "Must be at least 1."),
});
type FormValues = z.infer<typeof Schema>;

export function OnboardingForm({ defaultEmail }: { defaultEmail?: string }) {
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: "",
      state: "",
      address: "",
      phone: "",
      email: defaultEmail ?? "",
      gstin: "",
      invoice_prefix: "",
      next_invoice_number: 1,
    },
  });

  const state = watch("state");

  async function onSubmit(values: FormValues) {
    setPending(true);
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      fd.set(k, v == null ? "" : String(v));
    });
    const result = await createCompany(fd);
    if (result.ok) {
      toast.success("Company created. Welcome!");
      // Hard navigation forces a fresh request, sidesteps any RSC cache
      // that might still think this user has no membership.
      window.location.href = "/";
    } else {
      toast.error(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 flex flex-col gap-2">
          <Label htmlFor="name">Company name *</Label>
          <Input id="name" autoFocus {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col gap-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            placeholder="e.g. 592 - FF, HBC, Sector 51, Gurugram - 122001 (HR)"
            {...register("address")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="gstin">GSTIN</Label>
          <Input id="gstin" placeholder="06AAKFK3109Q2ZY" {...register("gstin")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="state">State *</Label>
          <Select
            value={state || undefined}
            onValueChange={(v) => {
              if (typeof v === "string") {
                setValue("state", v, { shouldValidate: true });
              }
            }}
          >
            <SelectTrigger id="state">
              <SelectValue placeholder="Select your state" />
            </SelectTrigger>
            <SelectContent>
              {INDIA_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state && (
            <p className="text-sm text-destructive">{errors.state.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="invoice_prefix">Invoice prefix (optional)</Label>
          <Input id="invoice_prefix" placeholder="e.g. KC-" {...register("invoice_prefix")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="next_invoice_number">Next invoice number *</Label>
          <Input
            id="next_invoice_number"
            type="number"
            min={1}
            {...register("next_invoice_number", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Continue your existing series. (Krishna Cabs: 2121)
          </p>
          {errors.next_invoice_number && (
            <p className="text-sm text-destructive">
              {errors.next_invoice_number.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={pending} size="lg">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating company…
          </>
        ) : (
          "Create company"
        )}
      </Button>
    </form>
  );
}
