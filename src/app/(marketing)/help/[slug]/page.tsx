import { notFound } from "next/navigation";
import Link from "next/link";
import { getGuide, resolveRelated } from "@/lib/help-content";
import { getOptionalViewer } from "@/lib/optional-viewer";
import { renderBold } from "@/lib/simple-markdown";
import { ContactBlock } from "@/components/help/contact-block";
import { FeedbackWidget } from "./feedback-widget";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  return { title: guide?.title ?? "Help" };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function HelpGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const viewer = await getOptionalViewer();
  const related = resolveRelated(guide.related);

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground underline">
          ← Help
        </Link>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          {guide.title}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Last updated {fmtDate(guide.lastUpdated)}
        </p>
      </div>

      <ol className="flex flex-col gap-3 list-decimal list-inside">
        {guide.steps.map((step, i) => (
          <li key={i} className="text-sm text-foreground leading-relaxed">
            {renderBold(step)}
          </li>
        ))}
      </ol>

      {related.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Related
          </p>
          <ul className="flex flex-col gap-1">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={r.type === "guide" ? `/help/${r.slug}` : `/help/faq#${r.slug}`}
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <FeedbackWidget guideSlug={guide.slug} />
      </div>

      <ContactBlock
        company={viewer.companyName ?? "-"}
        userName={viewer.name ?? "-"}
        userEmail={viewer.email ?? "-"}
        pageLabel={guide.title}
      />
    </div>
  );
}
