import { ListPageSkeleton } from "@/components/ui/list-page-skeleton";

export default function ClientsLoading() {
  // Clients page has tabs but no search box; a smaller toolbar is fine
  // — the shared skeleton's three pill chips approximate it.
  return <ListPageSkeleton rows={5} toolbar={false} />;
}
