"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { INDIA_STATES } from "@/lib/india-states";
import type { Client } from "@/lib/supabase/types";
import { createClientAction, updateClientAction } from "./actions";

const Schema = z.object({
  name: z.string().min(1, "Name is required."),
  state: z.string().min(1, "Pick a state."),
  gstin: z.string().optional(),
  address: z.string().optional(),
  default_booked_by: z.string().optional(),
  notes: z.string().optional(),
  is_rcm: z.boolean(),
});
type FormValues = z.infer<typeof Schema>;

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const editing = !!client;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: client?.name ?? "",
      state: client?.state ?? "",
      gstin: client?.gstin ?? "",
      address: client?.address ?? "",
      default_booked_by: client?.default_booked_by ?? "",
      notes: client?.notes ?? "",
      is_rcm: client?.is_rcm ?? false,
    },
  });

  const state = watch("state");
  const isRcm = watch("is_rcm");

  async function onSubmit(values: FormValues) {
    setPending(true);
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("state", values.state);
    fd.set("gstin", values.gstin ?? "");
    fd.set("address", values.address ?? "");
    fd.set("default_booked_by", values.default_booked_by ?? "");
    fd.set("notes", values.notes ?? "");
    fd.set("is_rcm", String(values.is_rcm));

    const result = editing
      ? await updateClientAction(client!.id, fd)
      : await createClientAction(fd);

    if (result.ok) {
      toast.success(editing ? "Client updated." : "Client added.");
      onOpenChange(false);
      reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setPending(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!pending) onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit client" : "Add client"}</DialogTitle>
          <DialogDescription>
            Clients are billed entities. Their state drives intra- vs inter-state GST.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex flex-col gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" autoFocus {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" rows={2} {...register("address")} />
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
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input id="gstin" {...register("gstin")} />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <Label htmlFor="default_booked_by">Default contact</Label>
              <Input
                id="default_booked_by"
                placeholder="e.g. Mr. Rakesh Verma"
                {...register("default_booked_by")}
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <Label htmlFor="is_rcm" className="font-medium">
                  Reverse charge (RCM)
                </Label>
                <p className="text-xs text-muted-foreground">
                  When ON, invoices for this client show no GST line.
                </p>
              </div>
              <Switch
                id="is_rcm"
                checked={isRcm}
                onCheckedChange={(v) => setValue("is_rcm", v)}
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
