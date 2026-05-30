import { ListPageSkeleton } from "@/components/ui/list-page-skeleton";

export default function VehiclesLoading() {
  return <ListPageSkeleton rows={4} toolbar={false} />;
}
