import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Status pill, tinted by intent. All variants share the same shape so
 * they line up visually wherever they appear (status column, row badges,
 * inline tags). Use Badge for boolean states, semantic categories, etc.
 */
const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1",
    "rounded-md border border-transparent px-2 py-0.5",
    "text-[11px] font-medium leading-tight whitespace-nowrap",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ].join(" "),
  {
    variants: {
      // Faint tinted backgrounds (~8% opacity) with the saturated
      // accent colour as text, so the pill reads as a label, not a
      // loud sticker. Reversed/inactive uses grey-100 so it visibly
      // recedes.
      variant: {
        default: "bg-muted text-foreground",
        accent: "bg-[rgba(79,70,229,0.08)] text-[#4f46e5]",
        success: "bg-[rgba(5,150,105,0.08)] text-[#059669]",
        warning: "bg-[rgba(217,119,6,0.08)] text-[#d97706]",
        destructive: "bg-[rgba(220,38,38,0.08)] text-[#dc2626]",
        outline: "border-border bg-card text-foreground",
        ghost: "bg-[#f3f4f6] text-[#6b7280]",
        // Legacy alias kept for back-compat with existing call sites
        secondary: "bg-[rgba(79,70,229,0.08)] text-[#4f46e5]",
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
