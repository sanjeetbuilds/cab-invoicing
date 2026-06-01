import { User as UserIcon } from "lucide-react";

/**
 * Top-right identity label. Plain text, never a button or link, so
 * there is nothing to click and nothing to break.
 *
 * Settings and Sign out are already in the left nav (and in the
 * mobile More drawer), which makes a top-right menu that only
 * repeats them redundant. Keeping this quiet so it doesn't compete
 * with the page title or the page's primary action.
 *
 * On screens below sm the email is hidden so the strip stays
 * compact, the same identity is shown again at the bottom of the
 * mobile More drawer where Sign out also lives.
 */
export function UserMenu({ email }: { email: string }) {
  return (
    <div
      className="hidden sm:flex items-center gap-2 px-2 py-1 text-sm"
      aria-label="Signed-in account"
    >
      <UserIcon
        aria-hidden
        className="h-4 w-4 text-muted-foreground shrink-0"
      />
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Signed in as
        </span>
        <span
          className="truncate max-w-[200px] text-foreground"
          title={email}
        >
          {email}
        </span>
      </div>
    </div>
  );
}
