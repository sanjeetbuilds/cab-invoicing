import Link from "next/link";
import { AlertTriangle, Clock, FileWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/format";

export interface UnbilledClientRow {
  clientId: string;
  clientName: string;
  count: number;
  oldestDate: string;
}

export interface SmartRemindersProps {
  unbilled: UnbilledClientRow[];
  rateMissingCount: number;
  unpaidCount: number;
  unpaidTotal: number;
  unpaidOver30Count: number;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

/** Each reminder hides itself when there's nothing to show — this whole
 *  component renders nothing if every count is zero. */
export function SmartReminders({
  unbilled,
  rateMissingCount,
  unpaidCount,
  unpaidTotal,
  unpaidOver30Count,
}: SmartRemindersProps) {
  const unbilledTotal = unbilled.reduce((s, c) => s + c.count, 0);
  if (unbilledTotal === 0 && rateMissingCount === 0 && unpaidCount === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {unbilledTotal > 0 && (
        <Card className="border-[rgba(217,119,6,0.25)] bg-[rgba(217,119,6,0.05)]">
          <CardContent className="flex flex-col gap-2 py-4">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-[#d97706] mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">{unbilledTotal}</span> trip
                {unbilledTotal === 1 ? "" : "s"} not billed yet for{" "}
                <span className="font-semibold">{unbilled.length}</span> client
                {unbilled.length === 1 ? "" : "s"}
              </p>
            </div>
            <ul className="flex flex-col gap-1 pl-6">
              {unbilled.slice(0, 5).map((c) => (
                <li key={c.clientId} className="text-xs text-muted-foreground">
                  {c.clientName} — {c.count} trip{c.count === 1 ? "" : "s"}, oldest {fmtDate(c.oldestDate)}
                </li>
              ))}
            </ul>
            <Link
              href="/invoices/build"
              className="self-start text-xs font-medium text-primary hover:text-primary-hover"
            >
              Make invoices →
            </Link>
          </CardContent>
        </Card>
      )}

      {rateMissingCount > 0 && (
        <Card className="border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.04)]">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-2">
              <FileWarning className="h-4 w-4 text-[#dc2626] mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">{rateMissingCount}</span> trip
                {rateMissingCount === 1 ? "" : "s"} have no rate set
              </p>
            </div>
            <Link
              href="/rate-cards"
              className="shrink-0 text-xs font-medium text-primary hover:text-primary-hover"
            >
              Fix rates →
            </Link>
          </CardContent>
        </Card>
      )}

      {unpaidCount > 0 && (
        <Card className={unpaidOver30Count > 0 ? "border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.04)]" : undefined}>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-2">
              <AlertTriangle
                className={`h-4 w-4 mt-0.5 shrink-0 ${unpaidOver30Count > 0 ? "text-[#dc2626]" : "text-muted-foreground"}`}
              />
              <p className="text-sm text-foreground">
                <span className="font-semibold">{unpaidCount}</span> invoice{unpaidCount === 1 ? "" : "s"} unpaid,{" "}
                <span className="font-semibold">{formatINR(unpaidTotal)}</span>
                {unpaidOver30Count > 0 && (
                  <span className="text-[#dc2626]">
                    {" "}
                    — {unpaidOver30Count} over 30 days old
                  </span>
                )}
              </p>
            </div>
            <Link href="/invoices" className="shrink-0 text-xs font-medium text-primary hover:text-primary-hover">
              View →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
