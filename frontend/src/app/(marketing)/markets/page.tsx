import { Suspense } from "react";
import { LiveMarkets } from "@/components/markets/LiveMarkets";

export default function MarketsPage() {
  return (
    <div>
      <div className="mx-auto max-w-[1680px] px-3 pb-8 pt-3 sm:px-4 lg:px-6">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h1 className="text-base font-semibold">Live prices</h1>
          <p className="text-xs text-muted">
            Crypto streams from Coinbase and forex from Kraken, several times a second. Pick a market to see its chart.
          </p>
        </div>
        <Suspense>
          <LiveMarkets />
        </Suspense>
        <p className="mt-3 max-w-4xl text-2xs text-muted">
          Prices are for information only and may differ slightly from those of other providers. Forex rates are indicative; pairs marked
          Daily use the European Central Bank&apos;s reference rate, published once each business day.
        </p>
      </div>
    </div>
  );
}
