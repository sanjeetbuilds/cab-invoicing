"use client";

import { useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Check, ChevronDown, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HOW_IT_WORKS } from "@/lib/help-content";

const STORAGE_KEY = "taximunshi_how_it_works_hidden_v1";

export interface HowItWorksStatus {
  setup: boolean;
  trips: boolean;
  invoice: boolean;
  share: boolean;
}

/** Collapsible 4-step strip for the dashboard, with a ✓ per step based
 *  on real data. "Hide" collapses it to a single "How it works" link in
 *  the same spot — not a separate header control — so there's nothing
 *  else to keep in sync. */
export function HowItWorksStrip({ status }: { status: HowItWorksStatus }) {
  const [hidden, setHidden] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1",
  );

  function hide() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setHidden(true);
  }
  function show() {
    window.localStorage.removeItem(STORAGE_KEY);
    setHidden(false);
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={show}
        className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
      >
        <Compass className="h-4 w-4" />
        How it works
      </button>
    );
  }

  const doneFlags = [status.setup, status.trips, status.invoice, status.share];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">How TaxiMunshi works</p>
          <button
            type="button"
            onClick={hide}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Hide
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {HOW_IT_WORKS.steps.map((step, i) => {
            const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[step.icon] ?? Icons.Circle;
            const done = doneFlags[i];
            return (
              <div key={step.id} className="flex flex-col gap-1.5">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                    done ? "bg-[rgba(5,150,105,0.14)] text-[#059669]" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <p className={`text-xs font-semibold ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.line}</p>
              </div>
            );
          })}
        </div>
        <Link href="/help/a0-how-it-works" className="self-start inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover">
          <ChevronDown className="h-3 w-3 -rotate-90" />
          Read more
        </Link>
      </CardContent>
    </Card>
  );
}
