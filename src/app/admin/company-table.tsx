"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Check, Copy, KeyRound, Loader2, Pencil, Play, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { generateTempPassword } from "@/lib/temp-password";
import { buildLoginDetailsText } from "@/lib/login-details-text";
import type { AdminCompanyRow } from "./data";
import {
  sendNewTempPasswordAction,
  changeOwnerEmailAction,
  deleteCompanyAction,
  suspendCompanyAction,
  reactivateCompanyAction,
  type TempPasswordActionResult,
} from "./actions";

type DisplayStatus = "password_sent" | "password_expired" | "active" | "suspended";
type StatusFilter = "all" | DisplayStatus;

function displayStatus(row: AdminCompanyRow): DisplayStatus {
  if (row.status === "invited") return row.isPasswordExpired ? "password_expired" : "password_sent";
  return row.status;
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "suspended") return <Badge variant="destructive">Suspended</Badge>;
  if (status === "password_expired") return <Badge variant="warning">Password expired</Badge>;
  return <Badge variant="accent">Password sent</Badge>;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-IN", { month: "short" });
  return `${day} ${month} ${d.getFullYear()}`;
}

function relativeFromNow(iso: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "password_sent", label: "Password sent" },
  { value: "password_expired", label: "Password expired" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

interface ResultPanel {
  companyName: string;
  ownerEmail: string;
  tempPassword: string;
  appUrl: string;
  emailSent?: boolean;
}

function LoginDetailsPanel({ result, onDismiss }: { result: ResultPanel; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const text = buildLoginDetailsText({
      company: result.companyName,
      appUrl: result.appUrl,
      email: result.ownerEmail,
      password: result.tempPassword,
    });
    await navigator.clipboard.writeText(text);
    toast.success("Login details copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Card className="border-success/30 bg-success-soft">
      <CardContent className="flex flex-col gap-3 py-5">
        <p className="text-sm font-semibold text-foreground">
          New temporary password for {result.companyName}
        </p>
        <div className="rounded-lg border border-border bg-card p-3 text-sm flex flex-col gap-1">
          <p>
            Login: <span className="font-mono">{result.appUrl}</span>
          </p>
          <p>
            Email: <span className="font-mono">{result.ownerEmail}</span>
          </p>
          <p>
            Temporary password: <span className="font-mono font-semibold">{result.tempPassword}</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {result.emailSent
            ? `Email sent to ${result.ownerEmail}`
            : "Email couldn't be sent. Copy the details and share them on WhatsApp."}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy login details"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompanyTable({ rows }: { rows: AdminCompanyRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [resultPanel, setResultPanel] = useState<ResultPanel | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<AdminCompanyRow | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<AdminCompanyRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [confirmReactivate, setConfirmReactivate] = useState<AdminCompanyRow | null>(null);
  const [confirmResend, setConfirmResend] = useState<AdminCompanyRow | null>(null);
  const [changeEmailRow, setChangeEmailRow] = useState<AdminCompanyRow | null>(null);
  const [newEmail, setNewEmail] = useState("");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && displayStatus(r) !== statusFilter) return false;
      if (needle) {
        const hay = `${r.name} ${r.ownerEmail ?? ""} ${r.ownerName ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  function run(row: AdminCompanyRow, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusyId(row.id);
    startTransition(async () => {
      const result = await fn();
      setBusyId(null);
      if (!result.ok) toast.error(result.error ?? "Something went wrong.");
      else router.refresh();
    });
  }

  function handleTempPasswordResult(result: TempPasswordActionResult) {
    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong.");
      return;
    }
    toast.success(
      result.emailSent
        ? `New password sent to ${result.ownerEmail}`
        : "Couldn't send the email. Copy the login details and share them on WhatsApp.",
    );
    if (result.companyName && result.ownerEmail && result.tempPassword && result.appUrl) {
      setResultPanel({
        companyName: result.companyName,
        ownerEmail: result.ownerEmail,
        tempPassword: result.tempPassword,
        appUrl: result.appUrl,
        emailSent: result.emailSent,
      });
    }
    router.refresh();
  }

  function onConfirmResend() {
    if (!confirmResend) return;
    const row = confirmResend;
    setConfirmResend(null);
    setBusyId(row.id);
    startTransition(async () => {
      const result = await sendNewTempPasswordAction({
        companyId: row.id,
        tempPassword: generateTempPassword(),
      });
      setBusyId(null);
      handleTempPasswordResult(result);
    });
  }

  function onConfirmChangeEmail() {
    if (!changeEmailRow) return;
    const row = changeEmailRow;
    setChangeEmailRow(null);
    setBusyId(row.id);
    startTransition(async () => {
      const result = await changeOwnerEmailAction({
        companyId: row.id,
        newEmail,
        tempPassword: generateTempPassword(),
      });
      setBusyId(null);
      setNewEmail("");
      handleTempPasswordResult(result);
    });
  }

  function onConfirmSuspend() {
    if (!confirmSuspend) return;
    if (suspendReason.trim().length < 5 || suspendReason.trim().length > 200) {
      setSuspendError("Reason must be 5–200 characters.");
      return;
    }
    const row = confirmSuspend;
    setConfirmSuspend(null);
    setSuspendError(null);
    run(row, () => suspendCompanyAction({ companyId: row.id, reason: suspendReason.trim() }));
    setSuspendReason("");
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-card shadow-card py-16 text-center">
        <p className="text-sm text-muted-foreground">No companies yet. Create the first one.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {resultPanel && (
        <LoginDetailsPanel result={resultPanel} onDismiss={() => setResultPanel(null)} />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => typeof v === "string" && setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl bg-card shadow-card overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Owner name</TableHead>
              <TableHead>Owner email</TableHead>
              <TableHead>Created on</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Setup</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  No companies match your search.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => {
              const ds = displayStatus(row);
              const busy = busyId === row.id;
              const preLogin = ds === "password_sent" || ds === "password_expired";
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{row.name}</span>
                      {row.selfSignup && <Badge variant="ghost">Self-signup</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{row.ownerName ?? "-"}</TableCell>
                  <TableCell>{row.ownerEmail ?? "-"}</TableCell>
                  <TableCell>{fmtDate(row.createdAt)}</TableCell>
                  <TableCell>{relativeFromNow(row.lastActiveAt)}</TableCell>
                  <TableCell>
                    {row.setupDone} of {row.setupTotal}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ds} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {(ds === "password_sent" || ds === "password_expired" || ds === "active") && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setConfirmResend(row)}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                          Send new temporary password
                        </Button>
                      )}
                      {preLogin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              setChangeEmailRow(row);
                              setNewEmail(row.ownerEmail ?? "");
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Change owner email
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setConfirmDelete(row)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            Delete company
                          </Button>
                        </>
                      )}
                      {ds === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setConfirmSuspend(row)}
                        >
                          <Ban className="h-4 w-4" />
                          Suspend
                        </Button>
                      )}
                      {ds === "suspended" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setConfirmReactivate(row)}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          Reactivate
                        </Button>
                      )}
                      <Link
                        href={`/admin/${row.id}`}
                        className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted"
                      >
                        View details
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Send new temporary password */}
      <AlertDialog open={confirmResend != null} onOpenChange={(o) => !o && setConfirmResend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send a new temporary password?</AlertDialogTitle>
            <AlertDialogDescription>
              Generate a new temporary password for {confirmResend?.ownerEmail}? Their current
              password will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmResend}>Send new password</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete company */}
      <AlertDialog open={confirmDelete != null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the company and its owner&apos;s login. Only possible before their
              first sign-in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const row = confirmDelete;
                setConfirmDelete(null);
                if (row) run(row, () => deleteCompanyAction({ companyId: row.id }));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend, reason required */}
      <AlertDialog
        open={confirmSuspend != null}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmSuspend(null);
            setSuspendReason("");
            setSuspendError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {confirmSuspend?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their users will be locked out until you reactivate. No data will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 px-6">
            <Label htmlFor="suspend-reason" className="text-xs">
              Reason (admin-only)
            </Label>
            <Textarea
              id="suspend-reason"
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Why is this company being suspended?"
            />
            {suspendError && <p className="text-sm text-destructive">{suspendError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmSuspend}>Suspend</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate */}
      <AlertDialog open={confirmReactivate != null} onOpenChange={(o) => !o && setConfirmReactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate {confirmReactivate?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their users will get access again immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const row = confirmReactivate;
                setConfirmReactivate(null);
                if (row) run(row, () => reactivateCompanyAction({ companyId: row.id }));
              }}
            >
              Reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change owner email */}
      <AlertDialog
        open={changeEmailRow != null}
        onOpenChange={(o) => {
          if (!o) {
            setChangeEmailRow(null);
            setNewEmail("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change owner email for {changeEmailRow?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Issues a fresh temporary password to the new address. The old one stops working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 px-6">
            <Label htmlFor="new-owner-email" className="text-xs">
              New owner email
            </Label>
            <Input
              id="new-owner-email"
              type="email"
              inputMode="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmChangeEmail}>
              <Check className="h-4 w-4" />
              Change email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
