"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitHelpFeedbackAction } from "../actions";

export function FeedbackWidget({ guideSlug }: { guideSlug: string }) {
  const [answered, setAnswered] = useState<"yes" | "no" | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function vote(helpful: boolean) {
    setAnswered(helpful ? "yes" : "no");
    if (helpful) {
      startTransition(async () => {
        await submitHelpFeedbackAction({ itemType: "guide", itemSlug: guideSlug, helpful: true });
      });
    }
  }

  function sendComment() {
    startTransition(async () => {
      const result = await submitHelpFeedbackAction({
        itemType: "guide",
        itemSlug: guideSlug,
        helpful: false,
        comment: comment.trim() || undefined,
      });
      if (result.ok) {
        setSent(true);
        toast.success("Thanks — we'll improve this page.");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (answered === "yes") {
    return <p className="text-sm text-muted-foreground">Thanks for letting us know.</p>;
  }

  if (answered === "no") {
    if (sent) {
      return <p className="text-sm text-muted-foreground">Thanks — we'll improve this page.</p>;
    }
    return (
      <div className="flex flex-col gap-2 max-w-md">
        <p className="text-sm text-foreground">What was missing?</p>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 300))}
          rows={3}
          placeholder="Optional — tell us what you were looking for."
        />
        <Button type="button" size="sm" className="self-start" disabled={pending} onClick={sendComment}>
          Send
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-foreground">Was this helpful?</p>
      <Button type="button" size="sm" variant="outline" onClick={() => vote(true)}>
        <ThumbsUp className="h-4 w-4" />
        Yes
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => vote(false)}>
        <ThumbsDown className="h-4 w-4" />
        No
      </Button>
    </div>
  );
}
