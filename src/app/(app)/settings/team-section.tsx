"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Role } from "@/lib/supabase/types";
import type { TeamMemberRow } from "./page";
import {
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
} from "./actions";

const INVITABLE_ROLES: { value: Exclude<Role, "owner">; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "viewer", label: "Viewer" },
];

const ALL_ROLES: { value: Role; label: string }[] = [
  { value: "owner", label: "Owner" },
  ...INVITABLE_ROLES,
];

export function TeamSection({
  currentRole,
  members,
}: {
  currentRole: Role;
  members: TeamMemberRow[];
}) {
  const router = useRouter();
  const canManage = currentRole === "owner" || currentRole === "admin";
  const canChangeRoles = currentRole === "owner";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "owner">>("staff");
  const [inviting, startInvite] = useTransition();
  const [pendingRow, setPendingRow] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TeamMemberRow | null>(null);

  function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter an email.");
      return;
    }
    startInvite(async () => {
      const result = await inviteMemberAction({ email: email.trim(), role });
      if (result.ok) {
        toast.success(
          `Invite created for ${email}. Share the app URL — they sign up with this email and join your team.`,
        );
        setEmail("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function onChangeRole(id: string, newRole: Role) {
    setPendingRow(id);
    const result = await updateMemberRoleAction({
      membership_id: id,
      role: newRole,
    });
    setPendingRow(null);
    if (result.ok) {
      toast.success("Role updated.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onRemove(row: TeamMemberRow) {
    setPendingRow(row.id);
    const result = await removeMemberAction({ membership_id: row.id });
    setPendingRow(null);
    setConfirmRemove(null);
    if (result.ok) {
      toast.success("Member removed.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Team
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Invite teammates by email. They sign up with the same email and get
          added to your company automatically.
        </p>
      </div>

      {canManage && (
        <form
          onSubmit={onInvite}
          className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
        >
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <Label htmlFor="invite-email" className="text-xs">Email</Label>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-40">
            <Label htmlFor="invite-role" className="text-xs">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => {
                if (typeof v === "string") {
                  setRole(v as Exclude<Role, "owner">);
                }
              }}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={inviting}>
            {inviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Invite
          </Button>
        </form>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className="w-[140px]">Role</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <span className="font-medium text-foreground">
                    {m.email ?? "—"}
                  </span>
                  {m.is_self && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (you)
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {canChangeRoles && !m.is_self ? (
                    <Select
                      value={m.role}
                      disabled={pendingRow === m.id}
                      onValueChange={(v) => {
                        if (typeof v === "string") {
                          onChangeRole(m.id, v as Role);
                        }
                      }}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={m.role === "owner" ? "accent" : "default"}>
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {m.user_id ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="warning">Pending</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canManage && !m.is_self && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      disabled={pendingRow === m.id}
                      onClick={() => setConfirmRemove(m)}
                      aria-label="Remove member"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={confirmRemove != null}
        onOpenChange={(o) => {
          if (!o) setConfirmRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove?.user_id
                ? `${confirmRemove?.email} will lose access to this company immediately.`
                : `The pending invite for ${confirmRemove?.email} will be cancelled.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemove && onRemove(confirmRemove)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
