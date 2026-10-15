import { Suspense } from "react";
import { PageTitle } from "@/components/ui/Panel";
import { LiveMarkets } from "@/components/markets/LiveMarkets";

export default function PricesPage() {
  return (
    <div>
      <PageTitle title="Live prices" description="Real-time crypto and forex prices. Pick a market to see its chart." />
      <Suspense>
        <LiveMarkets />
      </Suspense>
    </div>
  );
}
