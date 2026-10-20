import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { HELP_CATEGORIES, getGuidesByCategory, getFaqsByCategory } from "@/lib/help-content";
import { getOptionalViewer } from "@/lib/optional-viewer";
import { renderBold } from "@/lib/simple-markdown";
import { ContactBlock } from "@/components/help/contact-block";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = HELP_CATEGORIES.find((c) => c.id === id);
  return { title: category?.name ?? "Help" };
}

export default async function HelpCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = HELP_CATEGORIES.find((c) => c.id === id);
  if (!category) notFound();

  const viewer = await getOptionalViewer();
  const guides = getGuidesByCategory(id);
  const faqs = getFaqsByCategory(id);

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground underline">
          ← Help
        </Link>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          {category.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
      </div>

      {guides.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {guides.map((g) => (
            <Link
              key={g.slug}
              href={`/help/${g.slug}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">{g.title}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      {faqs.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">FAQs</h2>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {faqs.map((f) => (
              <details key={f.id} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground">
                  {f.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-2 text-sm text-muted-foreground">{renderBold(f.answer)}</div>
              </details>
            ))}
          </div>
        </div>
      )}

      <ContactBlock
        company={viewer.companyName ?? "-"}
        userName={viewer.name ?? "-"}
        userEmail={viewer.email ?? "-"}
        pageLabel={category.name}
      />
    </div>
  );
}
