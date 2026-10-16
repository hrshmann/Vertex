import { Suspense } from "react";
import { LiveMarkets } from "@/components/markets/LiveMarkets";

export default function PricesPage() {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h1 className="text-base font-semibold">Live prices</h1>
        <p className="text-xs text-muted">Real-time crypto and forex prices. Pick a market to see its chart.</p>
      </div>
      <Suspense>
        <LiveMarkets />
      </Suspense>
    </div>
  );
}
