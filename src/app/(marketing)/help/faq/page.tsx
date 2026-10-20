import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { HELP_CATEGORIES, getFaqsByCategory } from "@/lib/help-content";
import { getOptionalViewer } from "@/lib/optional-viewer";
import { renderBold } from "@/lib/simple-markdown";
import { ContactBlock } from "@/components/help/contact-block";

export const metadata = { title: "FAQs" };

export default async function HelpFaqPage() {
  const viewer = await getOptionalViewer();
  const groups = HELP_CATEGORIES.map((c) => ({ category: c, faqs: getFaqsByCategory(c.id) })).filter(
    (g) => g.faqs.length > 0,
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground underline">
          ← Help
        </Link>
      </div>

      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">All FAQs</h1>

      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.category.id} id={g.category.id} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {g.category.name}
            </h2>
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {g.faqs.map((f) => (
                <details key={f.id} id={f.id} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground">
                    {f.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {renderBold(f.answer)}
                    {f.guideSlug && (
                      <>
                        {" "}
                        <Link href={`/help/${f.guideSlug}`} className="font-medium text-primary hover:text-primary-hover">
                          Read more →
                        </Link>
                      </>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <ContactBlock
        company={viewer.companyName ?? "-"}
        userName={viewer.name ?? "-"}
        userEmail={viewer.email ?? "-"}
        pageLabel="FAQs"
      />
    </div>
  );
}
