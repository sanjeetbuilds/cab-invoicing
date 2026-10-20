import Link from "next/link";
import { GLOSSARY } from "@/lib/help-content";
import { getOptionalViewer } from "@/lib/optional-viewer";
import { ContactBlock } from "@/components/help/contact-block";

export const metadata = { title: "Glossary" };

export default async function GlossaryPage() {
  const viewer = await getOptionalViewer();

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground underline">
          ← Help
        </Link>
      </div>

      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Glossary</h1>

      <dl className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
        {GLOSSARY.map((entry) => (
          <div key={entry.term} className="px-4 py-3">
            <dt className="text-sm font-semibold text-foreground">{entry.term}</dt>
            <dd className="text-sm text-muted-foreground mt-0.5">{entry.definition}</dd>
          </div>
        ))}
      </dl>

      <ContactBlock
        company={viewer.companyName ?? "-"}
        userName={viewer.name ?? "-"}
        userEmail={viewer.email ?? "-"}
        pageLabel="Glossary"
      />
    </div>
  );
}
