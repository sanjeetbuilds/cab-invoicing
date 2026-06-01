/**
 * Faded sample-row blocks used by SamplePreview on each empty list
 * page. The SamplePreview wrapper already cuts opacity to ~45% and
 * adds a downward fade, so the bottom rows clearly read as not real.
 * On top of that, every sample row carries a "SAMPLE" pill right
 * next to the name on the left, where the eye lands first, and any
 * status pill renders in the neutral grey (ghost) variant so the
 * live "Paid", "Unpaid", "Accepted", "Sent" colours stay reserved
 * for real records.
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
    <div className="rounded-lg bg-card shadow-card px-4 py-2.5 flex items-center justify-between gap-3">
      {children}
    </div>
  );
}

/**
 * Wraps the left-side identity (name + optional sub-line) and the
 * SAMPLE pill so the pill always sits right next to the name where
 * the eye lands first.
 */
function Identity({
  name,
  sub,
}: {
  name: string;
  sub?: string;
}) {
  return (
    <div className="flex-1 min-w-0 flex items-center gap-2">
      <div className="min-w-0">
        <p className="font-semibold text-foreground truncate">{name}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      <SampleTag />
    </div>
  );
}

export function ClientsSampleRows() {
  return (
    <div className="flex flex-col gap-2">
      <Row>
        <Identity name="Bharti Foundation" sub="Delhi, 07AAATD2829H1Z3" />
        <Badge variant="ghost">RCM</Badge>
      </Row>
      <Row>
        <Identity name="JBM India" sub="Haryana, 06AAACF1234R2ZN" />
        <Badge variant="ghost">Charged</Badge>
      </Row>
      <Row>
        <Identity name="Trident Hotels" sub="Uttar Pradesh" />
        <Badge variant="ghost">Charged</Badge>
      </Row>
      <Row>
        <Identity name="Sunrise Logistics" sub="Maharashtra, 27AAACS0123J1ZB" />
        <Badge variant="ghost">Charged</Badge>
      </Row>
      <Row>
        <Identity name="Greentech BPO" sub="Karnataka" />
        <Badge variant="ghost">RCM</Badge>
      </Row>
      <Row>
        <Identity name="Apex Pharma" sub="Gujarat, 24AAACA9876H1ZK" />
        <Badge variant="ghost">Charged</Badge>
      </Row>
      <Row>
        <Identity name="Skyline Events" sub="Tamil Nadu" />
        <Badge variant="ghost">Charged</Badge>
      </Row>
      <Row>
        <Identity name="North Star Retail" sub="Punjab" />
        <Badge variant="ghost">Charged</Badge>
      </Row>
    </div>
  );
}

export function VehiclesSampleRows() {
  return (
    <div className="flex flex-col gap-2">
      <Row>
        <Identity name="HR 26 ED 9083" sub="Sonet" />
        <Badge variant="ghost">Own</Badge>
      </Row>
      <Row>
        <Identity name="HR 26 CD 6403" sub="Dzire" />
        <Badge variant="ghost">Attached</Badge>
      </Row>
      <Row>
        <Identity name="DL 1V 5188" sub="Crysta" />
        <Badge variant="ghost">Own</Badge>
      </Row>
      <Row>
        <Identity name="UP 16 BT 4501" sub="Innova" />
        <Badge variant="ghost">Attached</Badge>
      </Row>
      <Row>
        <Identity name="HR 26 AG 4972" sub="Ertiga" />
        <Badge variant="ghost">Own</Badge>
      </Row>
      <Row>
        <Identity name="DL 8C 8830" sub="Dzire" />
        <Badge variant="ghost">Attached</Badge>
      </Row>
      <Row>
        <Identity name="MH 02 BR 2210" sub="Crysta" />
        <Badge variant="ghost">Own</Badge>
      </Row>
    </div>
  );
}

export function RateCardsSampleRows() {
  function ClientGroup({
    name,
    rates,
  }: {
    name: string;
    rates: { car: string; mode: string; rate: string }[];
  }) {
    return (
      <div className="rounded-xl bg-card shadow-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground">{name}</p>
          <SampleTag />
          <p className="text-xs text-muted-foreground ml-auto">
            {rates.length} {rates.length === 1 ? "rate" : "rates"}
          </p>
        </div>
        {rates.map((r, i) => (
          <div key={i} className="rounded-md border border-border p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{r.car}</span>
              <Badge variant="ghost">{r.mode}</Badge>
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              {r.rate}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ClientGroup
        name="Bharti Foundation"
        rates={[
          { car: "Dzire", mode: "Local", rate: "Base ₹1,400, 80km/8hr, extra ₹14/km, night ₹300" },
          { car: "Crysta", mode: "Outstation", rate: "₹24 / km" },
        ]}
      />
      <ClientGroup
        name="JBM India"
        rates={[
          { car: "Sonet", mode: "Local", rate: "Base ₹1,500, 80km/8hr, extra ₹15/km, night ₹300" },
          { car: "Innova", mode: "Outstation", rate: "₹22 / km" },
          { car: "Dzire", mode: "Transfer", rate: "₹1,200 fixed, Airport T3 Drop" },
        ]}
      />
      <ClientGroup
        name="Trident Hotels"
        rates={[
          { car: "Crysta", mode: "Package", rate: "₹18,000 fixed, Manali 3D2N, includes toll" },
        ]}
      />
    </div>
  );
}

export function TripsSampleRows() {
  return (
    <div className="flex flex-col gap-2">
      <Row>
        <Identity name="Bharti Foundation, Sonet" sub="15/5/26, Local, 80 km" />
        <p className="font-mono text-sm font-semibold tabular-nums shrink-0">
          ₹1,500
        </p>
      </Row>
      <Row>
        <Identity name="JBM India, Crysta" sub="17/5/26, Outstation, 320 km" />
        <p className="font-mono text-sm font-semibold tabular-nums shrink-0">
          ₹7,680
        </p>
      </Row>
      <Row>
        <Identity name="Trident Hotels, Dzire" sub="18/5/26, Airport T3 Drop" />
        <p className="font-mono text-sm font-semibold tabular-nums shrink-0">
          ₹1,200
        </p>
      </Row>
      <Row>
        <Identity name="JBM India, Sonet" sub="19/5/26, Local, 95 km" />
        <p className="font-mono text-sm font-semibold tabular-nums shrink-0">
          ₹1,775
        </p>
      </Row>
      <Row>
        <Identity name="Apex Pharma, Innova" sub="20/5/26, Outstation, 410 km" />
        <p className="font-mono text-sm font-semibold tabular-nums shrink-0">
          ₹9,020
        </p>
      </Row>
      <Row>
        <Identity name="Sunrise Logistics, Dzire" sub="22/5/26, Local, 110 km" />
        <p className="font-mono text-sm font-semibold tabular-nums shrink-0">
          ₹1,900
        </p>
      </Row>
      <Row>
        <Identity name="Greentech BPO, Sonet" sub="24/5/26, Local, 78 km, night" />
        <p className="font-mono text-sm font-semibold tabular-nums shrink-0">
          ₹1,800
        </p>
      </Row>
    </div>
  );
}

export function InvoicesSampleRows() {
  return (
    <div className="flex flex-col gap-2">
      <Row>
        <Identity name="Bharti Foundation" sub="2037, May 2026" />
        <div className="flex items-center gap-3 shrink-0">
          <p className="font-mono text-sm font-semibold tabular-nums">
            ₹68,250
          </p>
          <Badge variant="ghost">Unpaid</Badge>
        </div>
      </Row>
      <Row>
        <Identity name="JBM India" sub="2036, April 2026" />
        <div className="flex items-center gap-3 shrink-0">
          <p className="font-mono text-sm font-semibold tabular-nums">
            ₹42,500
          </p>
          <Badge variant="ghost">Paid</Badge>
        </div>
      </Row>
      <Row>
        <Identity name="Trident Hotels" sub="2035, April 2026" />
        <div className="flex items-center gap-3 shrink-0">
          <p className="font-mono text-sm font-semibold tabular-nums">
            ₹23,890
          </p>
          <Badge variant="ghost">Paid</Badge>
        </div>
      </Row>
      <Row>
        <Identity name="Apex Pharma" sub="2034, April 2026" />
        <div className="flex items-center gap-3 shrink-0">
          <p className="font-mono text-sm font-semibold tabular-nums">
            ₹37,420
          </p>
          <Badge variant="ghost">Unpaid</Badge>
        </div>
      </Row>
      <Row>
        <Identity name="Sunrise Logistics" sub="2033, March 2026" />
        <div className="flex items-center gap-3 shrink-0">
          <p className="font-mono text-sm font-semibold tabular-nums">
            ₹51,200
          </p>
          <Badge variant="ghost">Paid</Badge>
        </div>
      </Row>
      <Row>
        <Identity name="Greentech BPO" sub="2032, March 2026" />
        <div className="flex items-center gap-3 shrink-0">
          <p className="font-mono text-sm font-semibold tabular-nums">
            ₹19,750
          </p>
          <Badge variant="ghost">Paid</Badge>
        </div>
      </Row>
      <Row>
        <Identity name="North Star Retail" sub="2031, February 2026" />
        <div className="flex items-center gap-3 shrink-0">
          <p className="font-mono text-sm font-semibold tabular-nums">
            ₹28,150
          </p>
          <Badge variant="ghost">Paid</Badge>
        </div>
      </Row>
    </div>
  );
}

export function QuotationsSampleRows() {
  return (
    <div className="flex flex-col gap-2">
      <Row>
        <Identity name="Bharti Foundation" sub="Q-005, dated 12/5/26" />
        <Badge variant="ghost">Accepted</Badge>
      </Row>
      <Row>
        <Identity name="JBM India" sub="Q-006, dated 18/5/26" />
        <Badge variant="ghost">Sent</Badge>
      </Row>
      <Row>
        <Identity name="Trident Hotels" sub="Q-007, dated 20/5/26" />
        <Badge variant="ghost">Draft</Badge>
      </Row>
      <Row>
        <Identity name="Apex Pharma" sub="Q-008, dated 22/5/26" />
        <Badge variant="ghost">Sent</Badge>
      </Row>
      <Row>
        <Identity name="Sunrise Logistics" sub="Q-009, dated 25/5/26" />
        <Badge variant="ghost">Accepted</Badge>
      </Row>
      <Row>
        <Identity name="Greentech BPO" sub="Q-010, dated 28/5/26" />
        <Badge variant="ghost">Draft</Badge>
      </Row>
    </div>
  );
}
