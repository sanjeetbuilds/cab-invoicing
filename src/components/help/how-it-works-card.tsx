import * as Icons from "lucide-react";
import { HOW_IT_WORKS } from "@/lib/help-content";

/** Compact, non-interactive 4-step strip — used in empty states, the
 *  Help panel, and the top of /help. The dashboard uses the collapsible,
 *  progress-aware HowItWorksStrip instead. */
export function HowItWorksCard({ highlightStep }: { highlightStep?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {HOW_IT_WORKS.steps.map((step, i) => {
          const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[step.icon] ?? Icons.Circle;
          const active = step.id === highlightStep;
          return (
            <div
              key={step.id}
              className={`flex flex-col gap-1.5 rounded-lg p-2 ${active ? "bg-[rgba(79,70,229,0.08)]" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    active ? "bg-[#4f46e5] text-white" : "bg-card border border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <p className="text-xs font-semibold text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.line}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
