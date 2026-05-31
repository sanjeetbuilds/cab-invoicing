"use client";

import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Info,
  TriangleAlert,
  OctagonX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * One reusable notification system for the whole app:
 *
 *   <Banner> ............ in-page, persistent, sits where you place it.
 *   notice.success(...) . toast, transient, top of viewport.
 *   notice.info(...)
 *   notice.warning(...)
 *   notice.error(...)
 *
 * Both surfaces use the same four variants and the same tinted look
 * (soft tinted background, icon in a tinted circle, bold title, body
 * text, optional action, dismiss X for banners). Live-region wiring
 * follows the variant: success / info stay polite (role=status),
 * warning / error get assertive (role=alert).
 */

export type NoticeVariant = "success" | "info" | "warning" | "error";

const variantStyles: Record<
  NoticeVariant,
  {
    bg: string;
    iconBg: string;
    iconColor: string;
    title: string;
    icon: typeof CheckCircle2;
    ariaRole: "status" | "alert";
    ariaLive: "polite" | "assertive";
  }
> = {
  success: {
    bg: "bg-[rgba(5,150,105,0.08)] border border-[rgba(5,150,105,0.18)]",
    iconBg: "bg-[rgba(5,150,105,0.14)]",
    iconColor: "text-[#059669]",
    title: "text-[#047857]",
    icon: CheckCircle2,
    ariaRole: "status",
    ariaLive: "polite",
  },
  info: {
    bg: "bg-[rgba(79,70,229,0.08)] border border-[rgba(79,70,229,0.18)]",
    iconBg: "bg-[rgba(79,70,229,0.14)]",
    iconColor: "text-[#4f46e5]",
    title: "text-[#4338ca]",
    icon: Info,
    ariaRole: "status",
    ariaLive: "polite",
  },
  warning: {
    bg: "bg-[rgba(217,119,6,0.08)] border border-[rgba(217,119,6,0.18)]",
    iconBg: "bg-[rgba(217,119,6,0.14)]",
    iconColor: "text-[#d97706]",
    title: "text-[#b45309]",
    icon: TriangleAlert,
    ariaRole: "alert",
    ariaLive: "assertive",
  },
  error: {
    bg: "bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.18)]",
    iconBg: "bg-[rgba(220,38,38,0.14)]",
    iconColor: "text-[#dc2626]",
    title: "text-[#b91c1c]",
    icon: OctagonX,
    ariaRole: "alert",
    ariaLive: "assertive",
  },
};

export function Banner({
  variant = "info",
  title,
  children,
  action,
  dismissible = true,
  className,
}: {
  variant?: NoticeVariant;
  title: ReactNode;
  children?: ReactNode;
  action?: { label: string; onClick: () => void };
  dismissible?: boolean;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const v = variantStyles[variant];
  const Icon = v.icon;

  return (
    <div
      role={v.ariaRole}
      aria-live={v.ariaLive}
      className={cn(
        "rounded-xl p-4 flex items-start gap-3",
        v.bg,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full",
          v.iconBg,
        )}
      >
        <Icon className={cn("h-5 w-5", v.iconColor)} />
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", v.title)}>{title}</p>
        {children && (
          <div className="text-sm text-foreground/80 mt-1">{children}</div>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={cn(
              "mt-2 text-sm font-medium underline-offset-2 hover:underline",
              v.iconColor,
            )}
          >
            {action.label}
          </button>
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Toast wrappers. Sonner already provides aria-live and icons; we add
 * a single duration policy: success / info auto-dismiss after about
 * four seconds, warning gets six, error stays open until the user
 * dismisses it.
 */
function showSuccess(message: string, description?: string) {
  return toast.success(message, { description, duration: 4000 });
}
function showInfo(message: string, description?: string) {
  return toast.info(message, { description, duration: 4000 });
}
function showWarning(message: string, description?: string) {
  return toast.warning(message, { description, duration: 6000 });
}
function showError(message: string, description?: string) {
  return toast.error(message, { description, duration: Infinity });
}

export const notice = {
  success: showSuccess,
  info: showInfo,
  warning: showWarning,
  error: showError,
};
