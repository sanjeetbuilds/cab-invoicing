import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-lg border text-sm font-medium whitespace-nowrap",
    // Hover applies on pointer devices; active:scale gives touch users
    // a visible "pressed" cue (hover never fires on a tap).
    "transition-[colors,transform] duration-150 outline-none select-none",
    "active:scale-[0.97]",
    "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — solid indigo with a subtle lift shadow so the
        // CTA reads as "raised" against the soft-shadow card field.
        default: [
          "bg-primary text-primary-foreground border-transparent",
          "shadow-[var(--shadow-primary)]",
          "hover:bg-primary-hover",
        ].join(" "),
        // Secondary — white surface with a thin grey border.
        outline: [
          "bg-card text-foreground border-border",
          "hover:bg-muted",
        ].join(" "),
        // Soft — indigo-tinted on a light indigo background.
        secondary: [
          "bg-accent-soft text-accent-foreground border-transparent",
          "hover:bg-accent-soft/70",
        ].join(" "),
        // Ghost — no chrome until hover.
        ghost: [
          "bg-transparent text-foreground border-transparent",
          "hover:bg-muted",
        ].join(" "),
        // Danger — destructive intent.
        destructive: [
          "bg-destructive text-destructive-foreground border-transparent",
          "hover:bg-destructive/90",
        ].join(" "),
        // Link — text-only.
        link: [
          "bg-transparent text-primary border-transparent underline-offset-4",
          "hover:underline",
        ].join(" "),
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 px-2 text-xs gap-1 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 px-3 text-[0.8125rem] gap-2",
        lg: "h-10 px-6 text-[0.9375rem]",
        icon: "h-9 w-9 px-0",
        "icon-xs": "h-6 w-6 px-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "h-8 w-8 px-0",
        "icon-lg": "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
