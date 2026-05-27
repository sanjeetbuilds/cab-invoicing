"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { seedFromPrototype } from "./actions";

export function SeedBanner() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSeed() {
    setPending(true);
    const result = await seedFromPrototype();
    if (result.ok) {
      toast.success(
        `Seeded ${result.counts.clients} clients, ${result.counts.vehicles} vehicles, ${result.counts.rateCards} rate cards.`,
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setPending(false);
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 mt-0.5 text-primary shrink-0" />
          <div>
            <p className="font-medium">Seed your real data from the prototype</p>
            <p className="text-sm text-muted-foreground">
              Import 4 clients, 10 vehicles, and 9 rate cards in one click.
              You can edit or delete any of them after.
            </p>
          </div>
        </div>
        <Button onClick={onSeed} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Importing…" : "Import sample data"}
        </Button>
      </CardContent>
    </Card>
  );
}
