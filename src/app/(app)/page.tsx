import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Dashboard — Krishna Cabs",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your business at a glance. Stats and unbilled trips will appear here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ["Unbilled trips", "—", "trips logged but not on an invoice yet"],
          ["Pending quotes", "—", "quotes you sent that haven't been accepted"],
          ["Outstanding", "₹—", "amount on unpaid invoices"],
          ["Billed this month", "₹—", "issued in the current calendar month"],
        ] as const).map(([label, value, hint]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming next</CardTitle>
          <CardDescription>
            Milestone 3 adds clients, vehicles, and rate cards — using your real
            data from <code className="text-xs">prototype-data.json</code>.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
