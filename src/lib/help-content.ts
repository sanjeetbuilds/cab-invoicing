import categoriesData from "@/content/help/categories.json";
import guidesData from "@/content/help/guides.json";
import faqsData from "@/content/help/faqs.json";
import popularData from "@/content/help/popular.json";
import contactData from "@/content/help/contact.json";
import whenToContactData from "@/content/help/when-to-contact.json";

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

export function getGuide(slug: string): HelpGuide | undefined {
  return HELP_GUIDES.find((g) => g.slug === slug);
}

export function getGuidesByCategory(categoryId: string): HelpGuide[] {
  return HELP_GUIDES.filter((g) => g.category === categoryId);
}

export function getFaqsByCategory(categoryId: string): HelpFaq[] {
  return HELP_FAQS.filter((f) => f.category === categoryId);
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
