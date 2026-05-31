"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { SaveBar, SaveBarSpacer } from "@/components/shell/save-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Company } from "@/lib/supabase/types";
import { updateNumberingAction } from "./actions";

const Schema = z.object({
  invoice_prefix: z.string().optional(),
  next_invoice_number: z.string().min(1, "Required."),
  quotation_prefix: z.string().optional(),
  next_quotation_number: z.string().min(1, "Required."),
});
type FormValues = z.infer<typeof Schema>;

export function NumberingForm({ company }: { company: Company }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      invoice_prefix: company.invoice_prefix ?? "",
      next_invoice_number: String(company.next_invoice_number ?? 1),
      quotation_prefix: company.quotation_prefix ?? "Q-",
      next_quotation_number: String(company.next_quotation_number ?? 1),
    },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    const result = await updateNumberingAction({
      invoice_prefix: values.invoice_prefix ?? "",
      next_invoice_number: Number(values.next_invoice_number),
      quotation_prefix: values.quotation_prefix ?? "",
      next_quotation_number: Number(values.next_quotation_number),
    });
    if (result.ok) {
      toast.success("Numbering saved.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setPending(false);
  }

  return (
    <form
      id="numbering-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Invoices</p>
            <p className="text-xs text-muted-foreground mt-1">
              The next invoice you issue will be <span className="font-mono">
                {/* live preview not needed, just hint */}
                {company.invoice_prefix ?? ""}
                {company.next_invoice_number}
              </span>.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invoice_prefix">Prefix</Label>
              <Input
                id="invoice_prefix"
                placeholder="(none)"
                {...register("invoice_prefix")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="next_invoice_number">Next number *</Label>
              <Input
                id="next_invoice_number"
                type="number"
                inputMode="numeric"
                {...register("next_invoice_number")}
              />
              {errors.next_invoice_number && (
                <p className="text-xs text-destructive">
                  {errors.next_invoice_number.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Quotations</p>
            <p className="text-xs text-muted-foreground mt-1">
              The next quotation you create will be <span className="font-mono">
                {company.quotation_prefix ?? ""}
                {company.next_quotation_number}
              </span>.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quotation_prefix">Prefix</Label>
              <Input
                id="quotation_prefix"
                placeholder="Q-"
                {...register("quotation_prefix")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="next_quotation_number">Next number *</Label>
              <Input
                id="next_quotation_number"
                type="number"
                inputMode="numeric"
                {...register("next_quotation_number")}
              />
              {errors.next_quotation_number && (
                <p className="text-xs text-destructive">
                  {errors.next_quotation_number.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <SaveBarSpacer />
      <SaveBar
        formId="numbering-form"
        pending={pending}
        hideCancel
        saveLabel="Save numbering"
      />
    </form>
  );
}
