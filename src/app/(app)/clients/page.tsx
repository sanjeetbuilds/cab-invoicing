import { requireMembership } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { Client } from "@/lib/supabase/types";
import { AddClientButton } from "./add-client-button";
import { ClientRowActions } from "./client-row-actions";

export const metadata = { title: "Clients — Krishna Cabs" };

export default async function ClientsPage() {
  const { supabase, membership } = await requireMembership();

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .eq("company_id", membership.company_id)
    .order("name", { ascending: true })
    .returns<Client[]>();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Companies you bill. State drives intra/inter-state GST."
      >
        <AddClientButton />
      </PageHeader>

      {error && (
        <p className="text-sm text-destructive">Failed to load: {error.message}</p>
      )}

      {clients && clients.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No clients yet. Click <strong>Add client</strong> to get started — or
            seed from your prototype data on the dashboard.
          </CardContent>
        </Card>
      )}

      {clients && clients.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-border bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">GST</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">
                      {c.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.state}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.gstin || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.default_booked_by || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {c.is_rcm ? (
                        <Badge variant="accent">RCM</Badge>
                      ) : (
                        <Badge variant="default">Charged</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <ClientRowActions client={c} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {clients.map((c) => (
              <Card key={c.id} size="sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.state}
                      {c.gstin ? ` • ${c.gstin}` : ""}
                    </p>
                    {c.default_booked_by && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.default_booked_by}
                      </p>
                    )}
                    <div className="mt-2">
                      {c.is_rcm ? (
                        <Badge variant="accent">RCM</Badge>
                      ) : (
                        <Badge variant="default">Charged</Badge>
                      )}
                    </div>
                  </div>
                  <ClientRowActions client={c} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
