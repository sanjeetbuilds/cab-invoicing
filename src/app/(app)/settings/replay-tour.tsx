"use client";

import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { REPLAY_EVENT } from "@/components/shell/tour-launcher";

export function ReplayTourSection() {
  function onReplay() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
  }
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(79,70,229,0.10)] text-[#4f46e5]"
          >
            <Lightbulb className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Replay the first-run tour
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Walks you through the five steps to your first invoice.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onReplay}>
          Replay tour
        </Button>
      </CardContent>
    </Card>
  );
}
