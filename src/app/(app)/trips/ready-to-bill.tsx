import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { UnbilledClientSummary } from "@/lib/unbilled-trips";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

/**
 * Tells the operator exactly who's ready to be billed, right where they
 * just finished logging trips — instead of making them remember to go
 * find the client again from the Invoices tab. `justLoggedClientId`
 * highlights whichever client the trip form just redirected from.
 */
export function ReadyToBill({
  clients,
  justLoggedClientId,
}: {
  clients: UnbilledClientSummary[];
  justLoggedClientId?: string;
}) {
  if (clients.length === 0) return null;

  const justLogged = clients.find((c) => c.clientId === justLoggedClientId);
  const rest = clients.filter((c) => c.clientId !== justLoggedClientId);

  return (
    <div className="flex flex-col gap-3">
      {justLogged && (
        <Card className="border-[rgba(5,150,105,0.3)] bg-[rgba(5,150,105,0.05)]">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-foreground">
              <span className="font-semibold">
                {justLogged.count} trip{justLogged.count === 1 ? "" : "s"}
              </span>{" "}
              logged for <span className="font-semibold">{justLogged.clientName}</span>. Ready to bill them?
            </p>
            <Link
              href={`/invoices/build?client=${justLogged.clientId}`}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover"
            >
              Build their invoice
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {rest.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              Ready to bill
            </p>
            <ul className="flex flex-col divide-y divide-border">
              {rest.map((c) => (
                <li key={c.clientId} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-foreground">
                    {c.clientName} — {c.count} trip{c.count === 1 ? "" : "s"}, oldest {fmtDate(c.oldestDate)}
                  </span>
                  <Link
                    href={`/invoices/build?client=${c.clientId}`}
                    className="shrink-0 text-xs font-medium text-primary hover:text-primary-hover"
                  >
                    Build invoice →
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
