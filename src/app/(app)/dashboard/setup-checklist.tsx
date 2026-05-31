"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronRight,
  IndianRupee,
  Receipt,
  Sparkles,
  Truck,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Six-step onboarding checklist that lives on the dashboard. Each
 * step's done state comes from real DB counts passed in as props, so
 * it stays accurate without a separate progress flag to keep in sync.
 *
 * When all six are done we collapse to a small "Setup complete." line
 * with a dismiss X. Dismissal is stored in localStorage so it sticks
 * per-browser without needing a schema change.
 */

const STORAGE_KEY = "easybills_setup_dismissed_v1";

export interface SetupStatus {
  companyDetails: boolean;
  hasClient: boolean;
  hasVehicle: boolean;
  hasRateCard: boolean;
  hasTrip: boolean;
  hasInvoice: boolean;
}

interface Step {
  key: keyof SetupStatus;
  number: number;
  icon: LucideIcon;
  title: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}

const STEPS: Step[] = [
  {
    key: "companyDetails",
    number: 1,
    icon: Building2,
    title: "Add your company details",
    primary: { label: "Open settings", href: "/settings" },
  },
  {
    key: "hasClient",
    number: 2,
    icon: Users,
    title: "Add your first client",
    primary: { label: "Add client", href: "/clients/new" },
    secondary: { label: "Import from Excel", href: "/bulk-import?scope=clients" },
  },
  {
    key: "hasVehicle",
    number: 3,
    icon: Truck,
    title: "Add your vehicles",
    primary: { label: "Add vehicle", href: "/vehicles/new" },
    secondary: { label: "Import from Excel", href: "/bulk-import?scope=vehicles" },
  },
  {
    key: "hasRateCard",
    number: 4,
    icon: IndianRupee,
    title: "Set rates for a client",
    primary: { label: "Add rates", href: "/rate-cards/new" },
    secondary: { label: "Import from Excel", href: "/bulk-import?scope=rate_cards" },
  },
  {
    key: "hasTrip",
    number: 5,
    icon: Receipt,
    title: "Add your first trip",
    primary: { label: "Add trip", href: "/trips/new" },
  },
  {
    key: "hasInvoice",
    number: 6,
    icon: Sparkles,
    title: "Make your first invoice",
    primary: { label: "Make invoice", href: "/invoices/build" },
  },
];

export function SetupChecklist({ status }: { status: SetupStatus }) {
  const [dismissed, setDismissed] = useState(false);

  const doneCount = STEPS.filter((s) => status[s.key]).length;
  const allDone = doneCount === STEPS.length;

  // Once complete, hide unless the user re-opens the dashboard fresh.
  // We honor a dismiss flag in localStorage so it doesn't keep popping.
  if (allDone) {
    if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)) {
      return null;
    }
    if (dismissed) return null;
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(5,150,105,0.14)]">
              <Check className="h-3.5 w-3.5 text-[#059669]" />
            </span>
            <span className="font-medium text-foreground">Setup complete.</span>
            <span className="text-muted-foreground">
              You can hide this and use the app freely.
            </span>
          </div>
          <button
            type="button"
            aria-label="Hide setup checklist"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, "1");
              setDismissed(true);
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-tour="setup-checklist">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Get to your first invoice
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Six short steps. Each one unlocks the next.
            </p>
          </div>
          <p className="text-xs font-medium text-muted-foreground tabular-nums">
            {doneCount} of {STEPS.length} done
          </p>
        </div>

        {/* Slim progress strip */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
          />
        </div>

        <ol className="flex flex-col gap-2">
          {STEPS.map((step) => {
            const done = status[step.key];
            return (
              <ChecklistRow
                key={step.key}
                step={step}
                done={done}
                stepIndex={step.number}
                totalSteps={STEPS.length}
              />
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function ChecklistRow({
  step,
  done,
  stepIndex,
  totalSteps,
}: {
  step: Step;
  done: boolean;
  stepIndex: number;
  totalSteps: number;
}) {
  const Icon = step.icon;
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:gap-4",
        done && "bg-muted/40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full",
          done
            ? "bg-[rgba(5,150,105,0.14)] text-[#059669]"
            : "bg-muted text-muted-foreground",
        )}
      >
        {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            done ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          Step {stepIndex} of {totalSteps}. {step.title}
        </p>
      </div>

      {!done && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Link
            href={step.primary.href}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover"
          >
            {step.primary.label}
            <ChevronRight className="h-4 w-4" />
          </Link>
          {step.secondary && (
            <Link
              href={step.secondary.href}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted"
            >
              <Upload className="h-3.5 w-3.5" />
              {step.secondary.label}
            </Link>
          )}
        </div>
      )}
    </li>
  );
}
