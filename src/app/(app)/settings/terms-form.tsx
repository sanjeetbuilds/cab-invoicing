"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { SaveBar, SaveBarSpacer } from "@/components/shell/save-bar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Company } from "@/lib/supabase/types";
import { updateTermsAction } from "./actions";

const Schema = z.object({
  terms_invoice: z.string().optional(),
  terms_quotation: z.string().optional(),
});
type FormValues = z.infer<typeof Schema>;

function toLines(arr: string[] | null | undefined): string {
  return (arr ?? []).join("\n");
}

function toArray(s: string | undefined): string[] {
  return (s ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function TermsForm({ company }: { company: Company }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      terms_invoice: toLines(company.terms_invoice),
      terms_quotation: toLines(company.terms_quotation),
    },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    const result = await updateTermsAction({
      terms_invoice: toArray(values.terms_invoice),
      terms_quotation: toArray(values.terms_quotation),
    });
    if (result.ok) {
      toast.success("Terms saved.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setPending(false);
  }

  return (
    <form
      id="terms-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="terms_invoice">Invoice terms</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              One per line. The first appears after &ldquo;TERMS &amp; CONDITIONS :&rdquo;
              on every invoice; the rest follow on their own lines.
            </p>
            <Textarea
              id="terms_invoice"
              rows={6}
              {...register("terms_invoice")}
              placeholder={[
                "Subjected to Gurugram Jurisdiction.",
                "Our Responsibility of the signed duty slip rests till we handover the same to you with the bill.",
                "Interest @ 18% will be charged if payment is not received within 15 days from the date of bill.",
                "System generated invoice, needs no signature.",
              ].join("\n")}
            />
          </div>
          <div>
            <Label htmlFor="terms_quotation">Quotation terms</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Same format — one per line.
            </p>
            <Textarea id="terms_quotation" rows={6} {...register("terms_quotation")} />
          </div>
        </CardContent>
      </Card>

      <SaveBarSpacer />
      <SaveBar
        formId="terms-form"
        pending={pending}
        hideCancel
        saveLabel="Save terms"
      />
    </form>
  );
}
