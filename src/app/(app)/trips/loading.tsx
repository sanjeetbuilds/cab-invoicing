import { ListPageSkeleton } from "@/components/ui/list-page-skeleton";

export default function TripsLoading() {
  // Trips has the most rows on a busy week — render 6 placeholders so
  // the shape matches a typical loaded screen.
  return <ListPageSkeleton rows={6} />;
}
