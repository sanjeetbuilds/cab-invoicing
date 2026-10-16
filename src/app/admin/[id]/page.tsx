import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLogEntry } from "@/lib/supabase/types";
import { loadCompanyDetail } from "../data";

export const metadata = { title: "Company details" };

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_LABEL: Record<string, string> = {
  created: "Company created",
  temp_password_sent: "New temporary password sent",
  owner_email_changed: "Owner email changed",
  suspended: "Suspended",
  reactivated: "Reactivated",
  deleted: "Company deleted",
};

function statusLabel(status: string, isPasswordExpired: boolean): string {
  if (status === "invited") return isPasswordExpired ? "Password expired" : "Password sent";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { admin } = await requireSuperAdmin();
  const { id } = await params;

  const [detail, { data: history }] = await Promise.all([
    loadCompanyDetail(admin, id),
    admin
      .from("admin_audit_log")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false })
      .returns<AuditLogEntry[]>(),
  ]);

  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={detail.name} />
      <p className="text-xs text-muted-foreground -mt-4">
        <Link href="/admin" className="underline">
          ← Back to companies
        </Link>
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <Field label="Company name" value={detail.name} />
          <Field label="State" value={detail.state} />
          <Field label="Status" value={statusLabel(detail.status, detail.isPasswordExpired)} />
          <Field
            label="Source"
            value={detail.createdVia === "admin" ? "Created via admin" : "Self-signup"}
          />
          <Field label="Created on" value={fmtDateTime(detail.createdAt)} />
          {detail.internalNote && (
            <div className="sm:col-span-2 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                Internal note (admin-only)
              </span>
              <p className="text-foreground whitespace-pre-wrap">{detail.internalNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    No members yet.
                  </TableCell>
                </TableRow>
              )}
              {detail.members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.name ?? "-"}</TableCell>
                  <TableCell>{m.email ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "owner" ? "accent" : "default"}>
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.lastActiveAt ? fmtDateTime(m.lastActiveAt) : "Never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>What</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!history || history.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    No admin actions recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {(history ?? []).map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{fmtDateTime(h.created_at)}</TableCell>
                  <TableCell>{ACTION_LABEL[h.action] ?? h.action}</TableCell>
                  <TableCell>{h.reason ?? "-"}</TableCell>
                  <TableCell>{h.actor_email ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
