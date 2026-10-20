import Link from "next/link";
import { CircleHelp } from "lucide-react";

/** The "?" icon shown in a page header, linking straight to the matching
 *  help guide. Kept as a tiny standalone component (not inlined into
 *  PageHeader) so pages outside PageHeader can still use it directly. */
export function HelpIconLink({ guideSlug }: { guideSlug: string }) {
  return (
    <Link
      href={`/help/${guideSlug}`}
      aria-label="Help for this page"
      title="Help for this page"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <CircleHelp className="h-[18px] w-[18px]" />
    </Link>
  );
}
