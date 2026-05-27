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
import type { Vehicle } from "@/lib/supabase/types";
import { createVehicleAction, updateVehicleAction } from "./actions";

const CAR_TYPES = ["Dzire", "Sonet", "Crysta", "Innova", "Ertiga", "Other"] as const;

const Schema = z.object({
  number: z.string().min(1, "Vehicle number is required."),
  type: z.enum(CAR_TYPES, { message: "Pick a vehicle type." }),
  ownership: z.enum(["own", "attached"], { message: "Pick ownership." }),
  vendor_name: z.string().optional(),
  active: z.boolean(),
});
type FormValues = z.infer<typeof Schema>;

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const editing = !!vehicle;

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
      number: vehicle?.number ?? "",
      type: vehicle?.type ?? "Dzire",
      ownership: vehicle?.ownership ?? "own",
      vendor_name: vehicle?.vendor_name ?? "",
      active: vehicle?.active ?? true,
    },
  });

  const type = watch("type");
  const ownership = watch("ownership");
  const active = watch("active");

  async function onSubmit(values: FormValues) {
    setPending(true);
    const fd = new FormData();
    fd.set("number", values.number);
    fd.set("type", values.type);
    fd.set("ownership", values.ownership);
    fd.set("vendor_name", values.vendor_name ?? "");
    fd.set("active", String(values.active));

    const result = editing
      ? await updateVehicleAction(vehicle!.id, fd)
      : await createVehicleAction(fd);

    if (result.ok) {
      toast.success(editing ? "Vehicle updated." : "Vehicle added.");
      onOpenChange(false);
      reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          <DialogDescription>
            Vehicles you drive — own or attached vendor cars.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="number">Vehicle number *</Label>
            <Input
              id="number"
              autoFocus
              placeholder="HR 26 ED 9083"
              {...register("number")}
            />
            {errors.number && (
              <p className="text-sm text-destructive">{errors.number.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  if (typeof v === "string") {
                    setValue(
                      "type",
                      v as (typeof CAR_TYPES)[number],
                      { shouldValidate: true },
                    );
                  }
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAR_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ownership">Ownership *</Label>
              <Select
                value={ownership}
                onValueChange={(v) => {
                  if (v === "own" || v === "attached") {
                    setValue("ownership", v, { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger id="ownership">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own</SelectItem>
                  <SelectItem value="attached">Attached</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {ownership === "attached" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="vendor_name">Vendor name</Label>
              <Input id="vendor_name" {...register("vendor_name")} />
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <Label htmlFor="active" className="font-medium">
                Active
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive vehicles are hidden from trip logging.
              </p>
            </div>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={(v) => setValue("active", v)}
            />
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
              {editing ? "Save changes" : "Add vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
