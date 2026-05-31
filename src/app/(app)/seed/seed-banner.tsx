"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Banner, notice } from "@/components/ui/notice";
import { seedFromPrototype } from "./actions";

export function SeedBanner() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSeed() {
    setPending(true);
    const result = await seedFromPrototype();
    if (result.ok) {
      notice.success(
        `Sample data added. ${result.counts.clients} clients, ${result.counts.vehicles} vehicles, and ${result.counts.rateCards} rates are now in your account.`,
      );
      router.refresh();
    } else {
      notice.error(result.error);
    }
    setPending(false);
  }

  return (
    <Banner
      variant="info"
      title="New here?"
      dismissible={false}
      action={undefined}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Add sample data to see how a finished account looks. It adds 4
          clients, 10 vehicles, and 9 rates. You can edit or remove them
          anytime.
        </p>
        <Button onClick={onSeed} disabled={pending} className="shrink-0">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Adding..." : "Add sample data"}
        </Button>
      </div>
    </Banner>
  );
}
