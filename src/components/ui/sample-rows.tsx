/**
 * Faded sample-row blocks used by SamplePreview on each empty list
 * page. Two to four rows of realistic-looking cab-business data so a
 * new user can see what the populated page will look like. Each row
 * carries a small "Sample" tag, the wrapper around them is already
 * aria-hidden and pointer-events-none in SamplePreview.
 *
 * These don't have to render the exact production table column-for-
 * column, just close enough that the page feels populated. The real
 * lists take over the moment the user adds their first real row.
 */
import { Badge } from "@/components/ui/badge";

function SampleTag() {
  return (
    <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
      Sample
    </Badge>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-card shadow-card px-4 py-3 flex items-center justify-between gap-3">
      {children}
    </div>
  );
}

export function ClientsSampleRows() {
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">Bharti Foundation</p>
          <p className="text-xs text-muted-foreground">Delhi, 07AAATD2829H1Z3</p>
        </div>
        <Badge variant="accent">RCM</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">JBM India</p>
          <p className="text-xs text-muted-foreground">Haryana, 06AAACF1234R2ZN</p>
        </div>
        <Badge variant="default">Charged</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">Trident Hotels</p>
          <p className="text-xs text-muted-foreground">Uttar Pradesh</p>
        </div>
        <Badge variant="default">Charged</Badge>
        <SampleTag />
      </Row>
    </div>
  );
}

export function VehiclesSampleRows() {
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <p className="font-mono font-semibold text-foreground">HR 26 ED 9083</p>
        <p className="text-xs text-muted-foreground">Sonet</p>
        <Badge variant="accent">Own</Badge>
        <SampleTag />
      </Row>
      <Row>
        <p className="font-mono font-semibold text-foreground">HR 26 CD 6403</p>
        <p className="text-xs text-muted-foreground">Dzire</p>
        <Badge variant="default">Attached</Badge>
        <SampleTag />
      </Row>
      <Row>
        <p className="font-mono font-semibold text-foreground">DL 1V 5188</p>
        <p className="text-xs text-muted-foreground">Crysta</p>
        <Badge variant="accent">Own</Badge>
        <SampleTag />
      </Row>
    </div>
  );
}

export function RateCardsSampleRows() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-card shadow-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground">Bharti Foundation</p>
          <p className="text-xs text-muted-foreground">2 rates</p>
          <span className="ml-auto"><SampleTag /></span>
        </div>
        <div className="rounded-md border border-border p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Dzire</span>
            <Badge variant="outline">Local</Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            Base ₹1,400, 80km / 8hr, extra ₹14/km, night ₹300
          </p>
        </div>
        <div className="rounded-md border border-border p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Crysta</span>
            <Badge variant="outline">Outstation</Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            ₹24 / km
          </p>
        </div>
      </div>
    </div>
  );
}

export function TripsSampleRows() {
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            Bharti Foundation, Sonet
          </p>
          <p className="text-xs text-muted-foreground">15/5/26, Local, 80 km</p>
        </div>
        <p className="font-mono text-sm font-semibold">₹1,500</p>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            JBM India, Crysta
          </p>
          <p className="text-xs text-muted-foreground">17/5/26, Outstation, 320 km</p>
        </div>
        <p className="font-mono text-sm font-semibold">₹7,680</p>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            Trident Hotels, Dzire
          </p>
          <p className="text-xs text-muted-foreground">18/5/26, Airport T3 Drop</p>
        </div>
        <p className="font-mono text-sm font-semibold">₹1,200</p>
        <SampleTag />
      </Row>
    </div>
  );
}

export function InvoicesSampleRows() {
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">2037</p>
          <p className="text-xs text-muted-foreground">Bharti Foundation, May 2026</p>
        </div>
        <p className="font-mono text-sm font-semibold">₹68,250</p>
        <Badge variant="warning">Unpaid</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">2036</p>
          <p className="text-xs text-muted-foreground">JBM India, April 2026</p>
        </div>
        <p className="font-mono text-sm font-semibold">₹42,500</p>
        <Badge variant="success">Paid</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">2035</p>
          <p className="text-xs text-muted-foreground">Trident Hotels, April 2026</p>
        </div>
        <p className="font-mono text-sm font-semibold">₹23,890</p>
        <Badge variant="success">Paid</Badge>
        <SampleTag />
      </Row>
    </div>
  );
}

export function QuotationsSampleRows() {
  return (
    <div className="flex flex-col gap-3">
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">Q-005</p>
          <p className="text-xs text-muted-foreground">
            Bharti Foundation, dated 12/5/26
          </p>
        </div>
        <Badge variant="success">Accepted</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">Q-006</p>
          <p className="text-xs text-muted-foreground">JBM India, dated 18/5/26</p>
        </div>
        <Badge variant="accent">Sent</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">Q-007</p>
          <p className="text-xs text-muted-foreground">
            Trident Hotels, dated 20/5/26
          </p>
        </div>
        <Badge variant="default">Draft</Badge>
        <SampleTag />
      </Row>
    </div>
  );
}
