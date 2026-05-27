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
import type { Vehicle } from "@/lib/supabase/types";
import { AddVehicleButton } from "./add-vehicle-button";
import { VehicleRowActions } from "./vehicle-row-actions";

export const metadata = { title: "Vehicles — Krishna Cabs" };

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
          <p className="text-sm text-muted-foreground">
            Your fleet — own and attached cars.
          </p>
        </div>
        <AddVehicleButton />
      </div>

      {error && (
        <p className="text-sm text-destructive">Failed to load: {error.message}</p>
      )}

      {vehicles && vehicles.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No vehicles yet. Click <strong>Add vehicle</strong> — or seed your
            10 prototype vehicles from the dashboard.
          </CardContent>
        </Card>
      )}

      {vehicles && vehicles.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border bg-card">
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
                    <TableCell className="font-mono font-medium">{v.number}</TableCell>
                    <TableCell>{v.type}</TableCell>
                    <TableCell>
                      {v.ownership === "own" ? (
                        <Badge>Own</Badge>
                      ) : (
                        <Badge variant="secondary">Attached</Badge>
                      )}
                    </TableCell>
                    <TableCell>{v.vendor_name || "—"}</TableCell>
                    <TableCell className="text-center">
                      {v.active ? (
                        <Badge variant="outline">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
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
          <div className="md:hidden flex flex-col gap-3">
            {vehicles.map((v) => (
              <Card key={v.id}>
                <CardContent className="py-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold">{v.number}</p>
                    <p className="text-sm text-muted-foreground">{v.type}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {v.ownership === "own" ? (
                        <Badge>Own</Badge>
                      ) : (
                        <Badge variant="secondary">
                          Attached{v.vendor_name ? ` — ${v.vendor_name}` : ""}
                        </Badge>
                      )}
                      {!v.active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  <VehicleRowActions vehicle={v} />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
