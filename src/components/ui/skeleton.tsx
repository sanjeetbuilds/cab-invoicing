import { cn } from "@/lib/utils";

/**
 * Base skeleton primitive — a rounded muted-grey block with a subtle
 * pulse. Wrap or compose to mimic the shape of the content that's
 * loading. Width and height come from utility classes or inline style.
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted/70", className)}
      {...props}
    />
  );
}
