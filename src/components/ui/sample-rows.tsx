/**
 * Faded sample-row blocks used by SamplePreview on each empty list
 * page. Six to eight rows of realistic-looking cab-business data so
 * the page reads as populated under the guide card, with a heavy
 * downward fade in SamplePreview making the bottom rows clearly
 * sample-not-real.
 *
 * These don't have to match the production list column-for-column,
 * just close enough that the page feels alive. The real list takes
 * over the moment the user adds their first real row.
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
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">Sunrise Logistics</p>
          <p className="text-xs text-muted-foreground">Maharashtra, 27AAACS0123J1ZB</p>
        </div>
        <Badge variant="default">Charged</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">Greentech BPO</p>
          <p className="text-xs text-muted-foreground">Karnataka</p>
        </div>
        <Badge variant="accent">RCM</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">Apex Pharma</p>
          <p className="text-xs text-muted-foreground">Gujarat, 24AAACA9876H1ZK</p>
        </div>
        <Badge variant="default">Charged</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">Skyline Events</p>
          <p className="text-xs text-muted-foreground">Tamil Nadu</p>
        </div>
        <Badge variant="default">Charged</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">North Star Retail</p>
          <p className="text-xs text-muted-foreground">Punjab</p>
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
      <Row>
        <p className="font-mono font-semibold text-foreground">UP 16 BT 4501</p>
        <p className="text-xs text-muted-foreground">Innova</p>
        <Badge variant="default">Attached</Badge>
        <SampleTag />
      </Row>
      <Row>
        <p className="font-mono font-semibold text-foreground">HR 26 AG 4972</p>
        <p className="text-xs text-muted-foreground">Ertiga</p>
        <Badge variant="accent">Own</Badge>
        <SampleTag />
      </Row>
      <Row>
        <p className="font-mono font-semibold text-foreground">DL 8C 8830</p>
        <p className="text-xs text-muted-foreground">Dzire</p>
        <Badge variant="default">Attached</Badge>
        <SampleTag />
      </Row>
      <Row>
        <p className="font-mono font-semibold text-foreground">MH 02 BR 2210</p>
        <p className="text-xs text-muted-foreground">Crysta</p>
        <Badge variant="accent">Own</Badge>
        <SampleTag />
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
          <p className="text-xs text-muted-foreground">
            {rates.length} {rates.length === 1 ? "rate" : "rates"}
          </p>
          <span className="ml-auto">
            <SampleTag />
          </span>
        </div>
        {rates.map((r, i) => (
          <div key={i} className="rounded-md border border-border p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{r.car}</span>
              <Badge variant="outline">{r.mode}</Badge>
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
          <p className="text-xs text-muted-foreground">
            17/5/26, Outstation, 320 km
          </p>
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
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            JBM India, Sonet
          </p>
          <p className="text-xs text-muted-foreground">19/5/26, Local, 95 km</p>
        </div>
        <p className="font-mono text-sm font-semibold">₹1,775</p>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            Apex Pharma, Innova
          </p>
          <p className="text-xs text-muted-foreground">
            20/5/26, Outstation, 410 km
          </p>
        </div>
        <p className="font-mono text-sm font-semibold">₹9,020</p>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            Sunrise Logistics, Dzire
          </p>
          <p className="text-xs text-muted-foreground">22/5/26, Local, 110 km</p>
        </div>
        <p className="font-mono text-sm font-semibold">₹1,900</p>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            Greentech BPO, Sonet
          </p>
          <p className="text-xs text-muted-foreground">
            24/5/26, Local, 78 km, night
          </p>
        </div>
        <p className="font-mono text-sm font-semibold">₹1,800</p>
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
          <p className="text-xs text-muted-foreground">
            Bharti Foundation, May 2026
          </p>
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
          <p className="text-xs text-muted-foreground">
            Trident Hotels, April 2026
          </p>
        </div>
        <p className="font-mono text-sm font-semibold">₹23,890</p>
        <Badge variant="success">Paid</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">2034</p>
          <p className="text-xs text-muted-foreground">Apex Pharma, April 2026</p>
        </div>
        <p className="font-mono text-sm font-semibold">₹37,420</p>
        <Badge variant="warning">Unpaid</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">2033</p>
          <p className="text-xs text-muted-foreground">
            Sunrise Logistics, March 2026
          </p>
        </div>
        <p className="font-mono text-sm font-semibold">₹51,200</p>
        <Badge variant="success">Paid</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">2032</p>
          <p className="text-xs text-muted-foreground">
            Greentech BPO, March 2026
          </p>
        </div>
        <p className="font-mono text-sm font-semibold">₹19,750</p>
        <Badge variant="success">Paid</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">2031</p>
          <p className="text-xs text-muted-foreground">
            North Star Retail, February 2026
          </p>
        </div>
        <p className="font-mono text-sm font-semibold">₹28,150</p>
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
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">Q-008</p>
          <p className="text-xs text-muted-foreground">
            Apex Pharma, dated 22/5/26
          </p>
        </div>
        <Badge variant="accent">Sent</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">Q-009</p>
          <p className="text-xs text-muted-foreground">
            Sunrise Logistics, dated 25/5/26
          </p>
        </div>
        <Badge variant="success">Accepted</Badge>
        <SampleTag />
      </Row>
      <Row>
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-foreground">Q-010</p>
          <p className="text-xs text-muted-foreground">
            Greentech BPO, dated 28/5/26
          </p>
        </div>
        <Badge variant="default">Draft</Badge>
        <SampleTag />
      </Row>
    </div>
  );
}
