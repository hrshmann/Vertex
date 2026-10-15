import { Suspense } from "react";
import { LiveMarkets } from "@/components/markets/LiveMarkets";

export default function MarketsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold">Live prices</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Crypto prices stream from Coinbase and forex rates from Kraken, updated several times a second. Pick a market to see its chart.
      </p>
      <div className="mt-6">
        <Suspense>
          <LiveMarkets />
        </Suspense>
      </div>
      <p className="mt-4 max-w-3xl text-2xs text-muted">
        Prices are for information only and may differ slightly from those of other providers. Forex rates are indicative; USD/JPY and
        NZD/USD use the European Central Bank's daily reference rate.
      </p>
    </div>
  );
}
