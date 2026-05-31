import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  elevated = false,
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  /**
   * Stronger lift for surfaces that need to feel emphasized (hero
   * tiles, install banners, sticky chips). Every card now gets the
   * base soft shadow by default — `elevated` opts into a more
   * pronounced one.
   */
  elevated?: boolean
}) {
  // No border — the soft dual-layer shadow stands in for it. 12px
  // radius is slightly more generous than the old 8px for a softer
  // feel; padding is a uniform 24px so cards breathe at every
  // breakpoint. size="sm" stays compact (16/20 px) for stat tiles
  // and dense lists.
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-3 sm:gap-4 rounded-xl bg-card text-sm text-card-foreground",
        elevated ? "shadow-card-hover" : "shadow-card",
        "data-[size=default]:p-6 data-[size=sm]:p-4 sm:data-[size=sm]:p-5 data-[size=sm]:gap-2 sm:data-[size=sm]:gap-3",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-col gap-1",
        "has-data-[slot=card-action]:flex-row has-data-[slot=card-action]:items-start has-data-[slot=card-action]:justify-between has-data-[slot=card-action]:gap-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-sans text-base leading-tight font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("flex flex-col gap-2", className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  // Negative margins must cancel the Card's padding at each breakpoint.
  // Default cards are p-6 everywhere; sm cards are p-4 mobile / p-5 sm+.
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "-mx-6 -mb-6 px-6 py-4 flex items-center justify-end gap-2 border-t border-border bg-muted/40 rounded-b-xl",
        "group-data-[size=sm]/card:-mx-4 group-data-[size=sm]/card:-mb-4 group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:py-3 sm:group-data-[size=sm]/card:-mx-5 sm:group-data-[size=sm]/card:-mb-5 sm:group-data-[size=sm]/card:px-5",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
