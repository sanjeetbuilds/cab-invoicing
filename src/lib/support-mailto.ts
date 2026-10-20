import { HELP_CONTACT } from "@/lib/help-content";

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/** The "Email support" mailto, pre-filled with the standard support
 *  template — company, name, email and page context, so every report
 *  reaches hello@taximunshi.com with enough to act on immediately. */
export function buildSupportMailto(vars: {
  company: string;
  name: string;
  email: string;
  pageUrl: string;
  pageLabel: string;
}): string {
  const subject = fillTemplate(HELP_CONTACT.mailto.subjectTemplate, {
    company: vars.company,
    page: vars.pageLabel,
  });
  const body = fillTemplate(HELP_CONTACT.mailto.bodyTemplate, {
    company: vars.company,
    name: vars.name,
    email: vars.email,
    pageUrl: vars.pageUrl,
  });
  return `mailto:${HELP_CONTACT.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildSuggestFeatureMailto(company: string): string {
  const subject = fillTemplate(HELP_CONTACT.suggestFeature.subjectTemplate, { company });
  const body = fillTemplate(HELP_CONTACT.suggestFeature.bodyTemplate, { company });
  return `mailto:${HELP_CONTACT.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** A bare mailto with no prefilled subject/body — for places with no
 *  company/page context to attach (e.g. the sign-in page). */
export function plainSupportMailto(): string {
  return `mailto:${HELP_CONTACT.supportEmail}`;
}
