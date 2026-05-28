"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { INDIA_STATES } from "@/lib/india-states";
import type { Company } from "@/lib/supabase/types";
import { updateCompanyAction } from "./actions";

const Schema = z.object({
  name: z.string().min(1, "Company name is required."),
  address: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  email: z
    .union([z.string().email("Enter a valid email."), z.literal("")])
    .optional(),
  invoice_email: z
    .union([z.string().email("Enter a valid email."), z.literal("")])
    .optional(),
  gstin: z.string().optional(),
  state: z.string().min(1, "Pick a state."),
});
type FormValues = z.infer<typeof Schema>;

export function CompanyForm({ company }: { company: Company }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: company.name ?? "",
      address: company.address ?? "",
      phone: company.phone ?? "",
      phone2: company.phone2 ?? "",
      email: company.email ?? "",
      invoice_email: company.invoice_email ?? "",
      gstin: company.gstin ?? "",
      state: company.state ?? "",
    },
  });

  const state = watch("state");

  async function onSubmit(values: FormValues) {
    setPending(true);
    const result = await updateCompanyAction({
      name: values.name,
      address: values.address ?? "",
      phone: values.phone ?? "",
      phone2: values.phone2 ?? "",
      email: values.email ?? "",
      invoice_email: values.invoice_email ?? "",
      gstin: values.gstin ?? "",
      state: values.state,
    });
    if (result.ok) {
      toast.success("Company details saved.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Card>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-col gap-2">
            <Label htmlFor="name">Company name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="sm:col-span-2 flex flex-col gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              rows={3}
              placeholder="592- FF, HBC, Sector 51&#10;Gurugram- 122001 (HR)"
              {...register("address")}
            />
            <p className="text-xs text-muted-foreground">
              Appears on the right side of every invoice.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Phone 1</Label>
            <Input id="phone" placeholder="+91 9999 00 4016" {...register("phone")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone2">
              Phone 2
              <span className="text-xs text-muted-foreground font-normal"> — optional</span>
            </Label>
            <Input
              id="phone2"
              placeholder="Second number on the invoice (optional)"
              {...register("phone2")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">
              Account email
              <span className="text-xs text-muted-foreground font-normal"> — for sign-in</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="login@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="invoice_email">
              Invoice email
              <span className="text-xs text-muted-foreground font-normal"> — shows on the invoice</span>
            </Label>
            <Input
              id="invoice_email"
              type="email"
              placeholder={company.email ?? "invoices@example.com"}
              {...register("invoice_email")}
            />
            {errors.invoice_email && (
              <p className="text-sm text-destructive">{errors.invoice_email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Blank = use the account email above.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input
              id="gstin"
              className="font-mono"
              placeholder="06AAKFK3109Q2ZY"
              {...register("gstin")}
            />
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
            {errors.state && (
              <p className="text-sm text-destructive">{errors.state.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Drives intra- vs inter-state GST on invoices.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
