import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // text-base on mobile prevents iOS Safari focus zoom; text-sm at
        // sm+ keeps desktop forms dense.
        "flex min-h-[72px] w-full rounded-lg border border-input bg-card px-3 py-2 text-base sm:text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "transition-colors duration-150 outline-none",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
