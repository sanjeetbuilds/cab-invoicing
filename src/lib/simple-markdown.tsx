import type { ReactNode } from "react";

/**
 * Renders `**bold**` spans inside otherwise-plain help content strings.
 * Deliberately minimal — the content files use exactly one markdown
 * feature (bold button names), not a full markdown renderer.
 */
export function renderBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
