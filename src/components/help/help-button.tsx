"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CircleHelp, Compass, Mail, Search } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOnThisPageTips, HELP_CONTACT, searchHelp } from "@/lib/help-content";
import { renderBold } from "@/lib/simple-markdown";
import { buildSupportMailto } from "@/lib/support-mailto";

/**
 * Fixed Help pill, present on every signed-in page. Opens a Sheet (side
 * panel on desktop, bottom sheet on mobile) so the page underneath — a
 * form mid-fill, the invoice builder — stays exactly as the user left it.
 *
 * The bottom offset is fixed rather than measured, since BottomNav and
 * SaveBar never show at the same time (confirmed in (app)/layout.tsx) —
 * clearing the taller of the two covers both cases on every breakpoint.
 */
export function HelpButton({
  companyName,
  userName,
  userEmail,
}: {
  companyName: string;
  userName: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();

  const tips = useMemo(() => getOnThisPageTips(pathname), [pathname]);
  const results = useMemo(() => searchHelp(query), [query]);

  const contactHref = buildSupportMailto({
    company: companyName,
    name: userName,
    email: userEmail,
    pageUrl: typeof window !== "undefined" ? window.location.href : pathname,
    pageLabel: pathname,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed z-[45] bottom-20 right-4 sm:bottom-20 sm:right-6 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground pl-3 pr-4 h-10 text-sm font-medium shadow-[var(--shadow-primary)] hover:bg-primary-hover"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <CircleHelp className="h-4 w-4" />
        Help
      </button>

      <Sheet open={open} onOpenChange={setOpen} title="Help">
        <div className="flex flex-col gap-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search e.g. GST, invoice number, Excel upload"
              className="pl-9"
              autoFocus
            />
          </div>

          {query.trim() ? (
            <div className="flex flex-col gap-2">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {renderBold(HELP_CONTACT.placements.searchNoResults.replace("{query}", query.trim()))}
                </p>
              ) : (
                results.slice(0, 8).map((r) =>
                  r.type === "guide" ? (
                    <Link
                      key={`g-${r.item.slug}`}
                      href={`/help/${r.item.slug}`}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
                    >
                      {r.item.title}
                    </Link>
                  ) : (
                    <Link
                      key={`f-${r.item.id}`}
                      href={r.item.guideSlug ? `/help/${r.item.guideSlug}` : `/help/faq#${r.item.id}`}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50"
                    >
                      {r.item.question}
                    </Link>
                  ),
                )
              )}
            </div>
          ) : (
            <>
              {tips.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    On this page
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {tips.map((tip, i) => (
                      <li key={i} className="text-sm text-foreground flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        {renderBold(tip)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Link
                href="/help/a0-how-it-works"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
              >
                <Compass className="h-4 w-4 text-primary" />
                How TaxiMunshi works
              </Link>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <a href={contactHref} className={cn(buttonVariants({ variant: "outline" }))}>
                  <Mail className="h-4 w-4" />
                  Email support
                </a>
                <Link href="/help" className="text-center text-sm font-medium text-primary hover:text-primary-hover">
                  Open full Help →
                </Link>
              </div>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
