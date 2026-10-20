"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { INDIA_STATES } from "@/lib/india-states";
import { createClientAction } from "../clients/actions";

interface State {
  name: string;
  stateIn: string;
  gstin: string;
  is_rcm: boolean;
}

function initialState(defaultName: string): State {
  return { name: defaultName, stateIn: "", gstin: "", is_rcm: false };
}

/**
 * Client editor opened from inside the trip form, same Sheet pattern as
 * InlineVehicleForm — minimal fields, no nested <form>, Save runs the
 * action directly. Checks for an existing client with the same name
 * (case-insensitive) before creating a duplicate, selecting the existing
 * one instead if found.
 */
export function InlineClientForm({
  open,
  onOpenChange,
  defaultName = "",
  existingClients,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the name field, typed text from the picker. */
  defaultName?: string;
  /** Already-loaded client list, for the duplicate-name check. */
  existingClients: { id: string; name: string }[];
  onSaved: (client: { id: string; name: string }) => void;
}) {
  const [state, setState] = useState<State>(() => initialState(defaultName));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setState(initialState(defaultName));
      setPending(false);
    }
  }, [open, defaultName]);

  async function onSave() {
    const name = state.name.trim();
    if (!name) {
      toast.error("Client name is required.");
      return;
    }
    const existing = existingClients.find(
      (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      toast("This client already exists — selected it instead.");
      onSaved(existing);
      return;
    }
    if (!state.stateIn) {
      toast.error("Pick a state.");
      return;
    }
    setPending(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("state", state.stateIn);
    fd.set("gstin", state.gstin);
    fd.set("is_rcm", String(state.is_rcm));
    const result = await createClientAction(fd);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.client.name} added and selected.`);
    onSaved(result.client);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add client"
      footer={
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Save and select
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex flex-col gap-2">
          <Label htmlFor="ic-name">Client name *</Label>
          <Input
            id="ic-name"
            value={state.name}
            onChange={(e) => setState({ ...state, name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ic-state">State *</Label>
          <Select
            value={state.stateIn || undefined}
            onValueChange={(v) => typeof v === "string" && setState({ ...state, stateIn: v })}
          >
            <SelectTrigger id="ic-state">
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
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ic-gstin">GSTIN (optional)</Label>
          <Input
            id="ic-gstin"
            value={state.gstin}
            onChange={(e) => setState({ ...state, gstin: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <Label htmlFor="ic-rcm" className="font-medium">
              Reverse charge (RCM)
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Turn on only if this client pays GST themselves.
            </p>
          </div>
          <Switch
            id="ic-rcm"
            checked={state.is_rcm}
            onCheckedChange={(v) => setState({ ...state, is_rcm: v })}
          />
        </div>
      </div>
    </Sheet>
  );
}
