import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Status pill — tinted by intent. All variants share the same shape so
 * they line up visually wherever they appear (status column, row badges,
 * inline tags). Use Badge for boolean states, semantic categories, etc.
 */
const badgeVariants = cva(
  [
    "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1",
    "rounded-full border border-transparent px-2 py-0.5",
    "text-[11px] font-medium leading-none whitespace-nowrap",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ].join(" "),
  {
    variants: {
      variant: {
        // Neutral grey — default
        default: "bg-muted text-foreground",
        // Indigo tint — accent semantic
        accent: "bg-accent-soft text-accent-foreground",
        // Success — paid, active, ok
        success: "bg-success-soft text-success-foreground",
        // Warning — unpaid, pending, attention
        warning: "bg-warning-soft text-warning-foreground",
        // Destructive — reversed, errors, dangerous state
        destructive: "bg-destructive-soft text-destructive",
        // Outline — quiet labels
        outline: "border-border bg-card text-foreground",
        // Subtle ghost — for inactive/disabled rows
        ghost: "bg-transparent text-muted-foreground",
        // Legacy alias kept for back-compat with existing call sites
        secondary: "bg-accent-soft text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
