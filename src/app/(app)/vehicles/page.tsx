import Link from "next/link";
import { Upload } from "lucide-react";
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
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { Vehicle } from "@/lib/supabase/types";
import { AddVehicleButton } from "./add-vehicle-button";
import { VehicleRowActions } from "./vehicle-row-actions";

export const metadata = { title: "Vehicles" };

export default async function VehiclesPage() {
  const { supabase, membership } = await requireMembership();

  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("company_id", membership.company_id)
    .order("number", { ascending: true })
    .returns<Vehicle[]>();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vehicles"
        description="Your fleet — own and attached cars."
      >
        <Link
          href="/bulk-import?scope=vehicles"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Upload className="h-4 w-4" />
          Import
        </Link>
        <AddVehicleButton />
      </PageHeader>

      {error && (
        <p className="text-sm text-destructive">Failed to load: {error.message}</p>
      )}

      {vehicles && vehicles.length === 0 && (
        <Card>
          <CardContent className="py-12 px-4 text-center flex flex-col items-center gap-3">
            <h2 className="text-base font-semibold">No vehicles yet.</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add the cars you use for trips. Every trip is linked to one
              vehicle.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <AddVehicleButton />
              <Link
                href="/bulk-import?scope=vehicles"
                className={buttonVariants({ variant: "outline" })}
              >
                <Upload className="h-4 w-4" />
                Import from Excel
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {vehicles && vehicles.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ownership</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-medium text-foreground">
                      {v.number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{v.type}</TableCell>
                    <TableCell>
                      {v.ownership === "own" ? (
                        <Badge variant="accent">Own</Badge>
                      ) : (
                        <Badge variant="default">Attached</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {v.vendor_name || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="ghost">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <VehicleRowActions vehicle={v} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-4 md:gap-5">
            {vehicles.map((v) => (
              <Card key={v.id} size="sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold text-foreground">{v.number}</p>
                    <p className="text-sm text-muted-foreground">{v.type}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {v.ownership === "own" ? (
                        <Badge variant="accent">Own</Badge>
                      ) : (
                        <Badge variant="default">
                          Attached{v.vendor_name ? ` — ${v.vendor_name}` : ""}
                        </Badge>
                      )}
                      {!v.active && <Badge variant="ghost">Inactive</Badge>}
                    </div>
                  </div>
                  <VehicleRowActions vehicle={v} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
