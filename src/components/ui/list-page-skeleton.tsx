import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared loading skeleton for any list page (Invoices, Quotations,
 * Trips, Clients, Fleet, Rate cards). Roughly matches the real layout:
 *
 *   - Page header row (title + action button)
 *   - Optional sticky toolbar (search + filter pills)
 *   - N stacked card rows on mobile / table rows on desktop
 *
 * Pixel-perfect match isn't the goal — what matters is the user sees a
 * shape that resolves into real content rather than a blank screen.
 */
export function ListPageSkeleton({
  rows = 5,
  toolbar = true,
}: {
  rows?: number;
  toolbar?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header — title + action button */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-32 sm:h-8 sm:w-40" />
        <Skeleton className="h-9 w-32 sm:w-36" />
      </div>

      {/* Toolbar — search + pills */}
      {toolbar && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>
      )}

      {/* Card rows */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-start justify-between gap-3">
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-6 w-24 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard-specific skeleton — hero card, 2×2 / 4×1 stat grid, and
 * an "unbilled by client" list below. Shape mirrors the dashboard at
 * a glance.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Skeleton className="h-7 w-32 sm:h-8 sm:w-40" />

      {/* Hero "What's next" prompt */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Skeleton className="h-5 w-3/4 sm:w-1/2" />
          <Skeleton className="h-9 w-32 shrink-0" />
        </CardContent>
      </Card>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} size="sm">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>

      {/* Unbilled by client */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-5 w-48" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
