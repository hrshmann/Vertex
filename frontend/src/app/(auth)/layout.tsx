"use client";

import Link from "next/link";
import clsx from "clsx";
import { Logo } from "@/components/Logo";
import { PriceFlash } from "@/components/PriceFlash";
import { useMarkets } from "@/lib/useMarkets";
import { priceDecimals } from "@/lib/format";

const SHOWN = ["BTC/USD", "ETH/USD", "EUR/USD", "GBP/USD", "SOL/USD"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { rows } = useMarkets();
  const markets = SHOWN.map((s) => rows.find((r) => r.symbol === s)).filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-7 w-7" />
          Vertex Trading
        </Link>

        <div className="max-w-sm">
          <p className="text-xl font-semibold leading-snug">
            Live crypto and forex prices, streamed in real time.
          </p>
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {markets.length === 0
              ? SHOWN.map((s) => (
                  <li key={s} className="flex justify-between py-3 text-sm text-muted">
                    {s}
                    <span>—</span>
                  </li>
                ))
              : markets.map((r) => {
                  const change = r.quote?.change24hPct ?? null;
                  return (
                    <li key={r.symbol} className="flex items-center justify-between py-3 text-sm">
                      <span className="font-medium">{r.symbol}</span>
                      <span className="flex items-center gap-3">
                        <PriceFlash value={r.quote?.last} decimals={priceDecimals(r.symbol, r.quote?.last)} />
                        {change != null && (
                          <span className={clsx("w-14 text-right text-2xs vx-tabular", change >= 0 ? "text-buy" : "text-sell")}>
                            {change >= 0 ? "+" : ""}
                            {change.toFixed(2)}%
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
          </ul>
          <p className="mt-3 text-2xs text-muted">Live prices from Coinbase and Kraken.</p>
        </div>

        <p className="max-w-sm text-2xs text-muted">
          Trading leveraged products carries a high risk of losing money. Vertex Trading is a demonstration platform, not a
          licensed broker.
        </p>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Link href="/" className="mb-10 flex items-center gap-2 font-semibold lg:hidden">
          <Logo className="h-7 w-7" />
          Vertex Trading
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">{children}</div>
      </main>
    </div>
  );
}
