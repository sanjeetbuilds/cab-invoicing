"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  HELP_CATEGORIES,
  HELP_POPULAR,
  HELP_CONTACT,
  searchHelp,
} from "@/lib/help-content";
import { renderBold } from "@/lib/simple-markdown";

function CategoryIcon({ name }: { name: string }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.CircleHelp;
  return <Icon className="h-5 w-5" />;
}

export function HelpSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchHelp(query), [query]);
  const isSearching = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          How can we help?
        </h1>
        <div className="relative mt-4 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. GST, invoice number, Excel upload"
            className="pl-9 h-11"
            autoFocus
          />
        </div>
      </div>

      {isSearching ? (
        <div className="flex flex-col gap-3 max-w-xl">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {renderBold(HELP_CONTACT.placements.searchNoResults.replace("{query}", query.trim()))}
            </p>
          ) : (
            results.map((r) =>
              r.type === "guide" ? (
                <Link
                  key={`g-${r.item.slug}`}
                  href={`/help/${r.item.slug}`}
                  className="rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{r.item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Guide</p>
                </Link>
              ) : (
                <Link
                  key={`f-${r.item.id}`}
                  href={r.item.guideSlug ? `/help/${r.item.guideSlug}` : `/help/faq#${r.item.id}`}
                  className="rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{r.item.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">FAQ</p>
                </Link>
              ),
            )
          )}
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Popular
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HELP_POPULAR.map((p) => (
                <Link
                  key={p.guideSlug}
                  href={`/help/${p.guideSlug}`}
                  className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Browse by topic
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {HELP_CATEGORIES.map((c) => (
                <Link
                  key={c.id}
                  href={`/help/category/${c.id}`}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(79,70,229,0.08)] text-[#4f46e5]">
                    <CategoryIcon name={c.icon} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">{c.name}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{c.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/help/faq" className="text-sm font-medium text-primary hover:text-primary-hover">
              All FAQs →
            </Link>
            <Link href="/help/glossary" className="text-sm font-medium text-primary hover:text-primary-hover">
              Glossary →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
