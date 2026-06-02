import Link from "next/link";
import { Truck, Upload } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SamplePreview } from "@/components/ui/sample-preview";
import { VehiclesSampleRows } from "@/components/ui/sample-rows";
import { requireMembership } from "@/lib/auth";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListSticky } from "@/components/ui/list-sticky";
import { PageHeader } from "@/components/ui/page-header";
import type { Vehicle } from "@/lib/supabase/types";
import { AddVehicleButton } from "./add-vehicle-button";
import { VehicleRowActions } from "./vehicle-row-actions";

export const metadata = { title: "Vehicles" };

/** Shared column widths between the sticky column header and the
 *  data table below. null = auto, fills remaining space. */
const VEHICLE_COL_WIDTHS: (string | null)[] = [
  "180px", // Number (HR 26 ED 9083 in mono)
  "120px", // Type
  "130px", // Ownership badge
  null,    // Vendor (auto)
  "90px",  // Active
  "80px",  // Actions
];

function VehicleColGroup() {
  return (
    <colgroup>
      {VEHICLE_COL_WIDTHS.map((w, i) => (
        <col key={i} style={w ? { width: w } : undefined} />
      ))}
    </colgroup>
  );
}

export default async function VehiclesPage() {
  const { supabase, membership } = await requireMembership();

  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("company_id", membership.company_id)
    .order("number", { ascending: true })
    .returns<Vehicle[]>();

  const isEmpty = (vehicles ?? []).length === 0;

  return (
    <div className="flex flex-col gap-6">
      <ListSticky>
        <PageHeader
          title="Vehicles"
          description="Your cars, both your own and attached vendor cars."
        >
          <Link
            href="/bulk-import?scope=vehicles"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Upload className="h-4 w-4" />
            Import
          </Link>
          <AddVehicleButton muted={isEmpty} />
        </PageHeader>

        {/* Column header row, item 4 in the sticky stack on
            desktop. Shares column widths with the data table
            below via table-fixed + VehicleColGroup. */}
        {vehicles && vehicles.length > 0 && (
          <div className="hidden md:block -mb-3">
            <table className="w-full table-fixed text-sm">
              <VehicleColGroup />
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ownership</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
            </table>
          </div>
        )}
      </ListSticky>

      {error && (
        <p className="text-sm text-destructive">Failed to load: {error.message}</p>
      )}

      {vehicles && vehicles.length === 0 && (
        <SamplePreview
          icon={<Truck className="h-4 w-4" />}
          iconChipBg="#F1EAFE"
          iconChipFg="#4A2D7B"
          title="This is where your vehicles live."
          body="Add the cars you use for trips. Every trip is linked to one car."
          primary={{ label: "Add vehicle", href: "/vehicles/new" }}
          importHref="/bulk-import?scope=vehicles"
          setupHint={{ step: 3, total: 6 }}
        >
          <VehiclesSampleRows />
        </SamplePreview>
      )}

      {vehicles && vehicles.length > 0 && (
        <>
          {/* Desktop table, thead is in the sticky chrome above.
              Shared widths via VehicleColGroup. */}
          <div className="hidden md:block rounded-xl bg-card shadow-card overflow-hidden">
            <table className="w-full table-fixed text-sm">
              <VehicleColGroup />
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
                      {v.vendor_name || "-"}
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
            </table>
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
                          Attached{v.vendor_name ? `, ${v.vendor_name}` : ""}
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
