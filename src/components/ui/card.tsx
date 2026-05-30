import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  // Padding is ~20% tighter on mobile (p-4/p-3) and grows on sm+ to the
  // previous values (p-6/p-4). Cards feel calm at desktop widths and
  // dense on phones where vertical space is at a premium.
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-3 sm:gap-4 rounded-lg border border-border bg-card text-sm text-card-foreground",
        "shadow-card",
        "data-[size=default]:p-4 sm:data-[size=default]:p-6 data-[size=sm]:p-3 sm:data-[size=sm]:p-4 data-[size=sm]:gap-2 sm:data-[size=sm]:gap-3",
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
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "-mx-4 -mb-4 px-4 py-3 sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-4 flex items-center justify-end gap-2 border-t border-border bg-muted/40 rounded-b-lg",
        "group-data-[size=sm]/card:-mx-3 group-data-[size=sm]/card:-mb-3 group-data-[size=sm]/card:px-3 group-data-[size=sm]/card:py-2 sm:group-data-[size=sm]/card:-mx-4 sm:group-data-[size=sm]/card:-mb-4 sm:group-data-[size=sm]/card:px-4 sm:group-data-[size=sm]/card:py-3",
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
