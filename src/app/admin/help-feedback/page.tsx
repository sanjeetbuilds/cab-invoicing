import { requireSuperAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getGuide, HELP_FAQS } from "@/lib/help-content";

export const metadata = { title: "Help feedback" };

interface FeedbackRow {
  item_type: "guide" | "faq";
  item_slug: string;
  helpful: boolean;
  comment: string | null;
  created_at: string;
}

function itemTitle(type: "guide" | "faq", slug: string): string {
  if (type === "guide") return getGuide(slug)?.title ?? slug;
  return HELP_FAQS.find((f) => f.id === slug)?.question ?? slug;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HelpFeedbackPage() {
  const { admin } = await requireSuperAdmin();

  const { data: rows } = await admin
    .from("help_feedback")
    .select("item_type, item_slug, helpful, comment, created_at")
    .order("created_at", { ascending: false })
    .returns<FeedbackRow[]>();

  const groups = new Map<
    string,
    { type: "guide" | "faq"; slug: string; yes: number; no: number; lastAt: string; comments: { text: string; at: string }[] }
  >();

  for (const r of rows ?? []) {
    const key = `${r.item_type}:${r.item_slug}`;
    let g = groups.get(key);
    if (!g) {
      g = { type: r.item_type, slug: r.item_slug, yes: 0, no: 0, lastAt: r.created_at, comments: [] };
      groups.set(key, g);
    }
    if (r.helpful) g.yes++;
    else g.no++;
    if (r.comment) g.comments.push({ text: r.comment, at: r.created_at });
  }

  const sorted = Array.from(groups.values()).sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Help feedback"
        description="Yes/No votes and comments left on help guides and FAQs, newest activity first."
      />

      {sorted.length === 0 ? (
        <div className="rounded-xl bg-card shadow-card py-16 text-center">
          <p className="text-sm text-muted-foreground">No feedback yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((g) => (
            <div key={`${g.type}:${g.slug}`} className="rounded-xl bg-card shadow-card p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={g.type === "guide" ? "accent" : "ghost"}>
                    {g.type === "guide" ? "Guide" : "FAQ"}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">
                    {itemTitle(g.type, g.slug)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[#059669] font-medium">Yes {g.yes}</span>
                  <span className="text-[#dc2626] font-medium">No {g.no}</span>
                </div>
              </div>
              {g.comments.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>What was missing?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.comments.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {fmtDateTime(c.at)}
                        </TableCell>
                        <TableCell>{c.text}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
