import categoriesData from "@/content/help/categories.json";
import guidesData from "@/content/help/guides.json";
import faqsData from "@/content/help/faqs.json";
import popularData from "@/content/help/popular.json";
import contactData from "@/content/help/contact.json";
import whenToContactData from "@/content/help/when-to-contact.json";
import onThisPageData from "@/content/help/on-this-page.json";
import howItWorksData from "@/content/help/how-it-works.json";
import glossaryData from "@/content/help/glossary.json";

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface HelpGuide {
  slug: string;
  title: string;
  category: string;
  lastUpdated: string;
  steps: string[];
  related: string[];
}

export interface HelpFaq {
  id: string;
  category: string;
  question: string;
  answer: string;
  guideSlug: string | null;
}

export interface HelpPopularLink {
  label: string;
  guideSlug: string;
}

export interface HelpContact {
  supportEmail: string;
  replyTime: string;
  standardBlock: string;
  emailButtonLabel: string;
  mailto: { subjectTemplate: string; bodyTemplate: string };
  suggestFeature: { subjectTemplate: string; bodyTemplate: string };
  placements: Record<string, string>;
}

export interface HowItWorksStep {
  id: string;
  icon: string;
  title: string;
  line: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const HELP_CATEGORIES = categoriesData as HelpCategory[];
export const HELP_GUIDES = guidesData as HelpGuide[];
export const HELP_FAQS = faqsData as HelpFaq[];
export const HELP_POPULAR = popularData as HelpPopularLink[];
export const HELP_CONTACT = contactData as HelpContact;
export const HELP_WHEN_TO_CONTACT = whenToContactData as {
  intro: string;
  reasons: string[];
  alwaysInclude: string;
};
export const HOW_IT_WORKS = howItWorksData as { intro: string; steps: HowItWorksStep[] };
export const GLOSSARY = glossaryData as GlossaryEntry[];

const ON_THIS_PAGE = onThisPageData as { path: string; tips: string[] }[];

/** Longest-prefix match against the current pathname, so "/trips/new"
 *  gets its own tips instead of falling through to the generic "/trips"
 *  entry. Falls back to an empty list rather than guessing. */
export function getOnThisPageTips(pathname: string): string[] {
  let best: { path: string; tips: string[] } | null = null;
  for (const entry of ON_THIS_PAGE) {
    if (pathname === entry.path || pathname.startsWith(entry.path + "/")) {
      if (!best || entry.path.length > best.path.length) best = entry;
    }
  }
  return best?.tips ?? [];
}

export function getGuide(slug: string): HelpGuide | undefined {
  return HELP_GUIDES.find((g) => g.slug === slug);
}

export function getGuidesByCategory(categoryId: string): HelpGuide[] {
  return HELP_GUIDES.filter((g) => g.category === categoryId);
}

export function getFaqsByCategory(categoryId: string): HelpFaq[] {
  return HELP_FAQS.filter((f) => f.category === categoryId);
}

export type HelpSearchResult =
  | { type: "guide"; item: HelpGuide }
  | { type: "faq"; item: HelpFaq };

function textMatches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle);
}

/** Shared by the public /help search box and the in-app Help panel. */
export function searchHelp(query: string): HelpSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: HelpSearchResult[] = [];
  for (const g of HELP_GUIDES) {
    if (textMatches(g.title, q) || g.steps.some((s) => textMatches(s, q))) {
      results.push({ type: "guide", item: g });
    }
  }
  for (const f of HELP_FAQS) {
    if (textMatches(f.question, q) || textMatches(f.answer, q)) {
      results.push({ type: "faq", item: f });
    }
  }
  return results;
}

/** Resolves a guide/FAQ's "related" entries for display — related arrays
 *  currently hold only guide slugs, but this stays tolerant of a bare
 *  slug matching a FAQ id too, in case content grows that way later. */
export function resolveRelated(slugs: string[]): Array<
  | { type: "guide"; slug: string; title: string }
  | { type: "faq"; slug: string; title: string }
> {
  const out: Array<{ type: "guide" | "faq"; slug: string; title: string }> = [];
  for (const s of slugs) {
    const guide = getGuide(s);
    if (guide) {
      out.push({ type: "guide", slug: guide.slug, title: guide.title });
      continue;
    }
    const faq = HELP_FAQS.find((f) => f.id === s);
    if (faq) out.push({ type: "faq", slug: faq.id, title: faq.question });
  }
  return out;
}
