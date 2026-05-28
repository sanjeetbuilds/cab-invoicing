import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Base
        "h-9 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "transition-colors duration-150 outline-none",
        // Focus
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
        // Invalid
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
        // File inputs
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Strip native number spinners — done globally in CSS too, belt-and-braces
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }
