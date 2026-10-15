"use client";

import Link from "next/link";
import clsx from "clsx";
import { CandlestickChart, Radio, ShieldCheck } from "lucide-react";
import { useMarkets } from "@/lib/useMarkets";
import { useAuth } from "@/lib/AuthContext";
import { priceDecimals } from "@/lib/format";
import { instrumentName } from "@/lib/instruments";
import { PriceFlash } from "@/components/PriceFlash";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/States";

const BOARD = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "EUR/USD", "GBP/USD", "USD/JPY"];

const POINTS = [
  {
    icon: Radio,
    title: "Straight from the source",
    body: "Crypto prices come from Coinbase and forex rates from Kraken, several times a second. Every price shows where it came from and when.",
  },
  {
    icon: CandlestickChart,
    title: "Charts for every market",
    body: "Candlestick charts from one minute to one month, updating live as new prices arrive.",
  },
  {
    icon: ShieldCheck,
    title: "Verified accounts",
    body: "Open an account and verify your identity in a few minutes. Your documents are encrypted and only seen by our compliance team.",
  },
];

export default function HomePage() {
  const { rows } = useMarkets();
  const { user } = useAuth();
  const board = BOARD.map((s) => rows.find((r) => r.symbol === s)).filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <div>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[minmax(0,1fr)_30rem] lg:px-8">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-sm font-medium text-buy">
            <span className="h-2 w-2 animate-pulse rounded-full bg-buy" aria-hidden />
            Markets are live
          </p>
          <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.1] tracking-tight md:text-5xl">
            Crypto and forex prices, the moment they move.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted">
            Bitcoin, Ethereum and the major currency pairs, streamed in real time with charts for every market. Free to watch, no
            account needed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/markets" size="lg">
              See live prices
            </ButtonLink>
            {user ? (
              <ButtonLink href="/dashboard" size="lg" variant="secondary">
                Go to dashboard
              </ButtonLink>
            ) : (
              <ButtonLink href="/register" size="lg" variant="secondary">
                Open an account
              </ButtonLink>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="text-sm font-semibold">Live prices</p>
            <p className="text-2xs text-muted">24h change</p>
          </div>
          <ul>
            {board.length === 0 &&
              BOARD.map((s) => (
                <li key={s} className="border-b border-line px-5 py-3.5 last:border-0">
                  <Skeleton className="h-6" />
                </li>
              ))}
            {board.map((r) => {
              const q = r.quote;
              const change = q?.change24hPct ?? null;
              return (
                <li key={r.symbol} className="border-b border-line last:border-0">
                  <Link href={`/markets?symbol=${encodeURIComponent(r.symbol)}`} className="grid grid-cols-[minmax(0,1fr)_auto_4.5rem] items-center gap-4 px-5 py-3 hover:bg-raised">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{r.symbol}</span>
                      <span className="block truncate text-2xs text-muted">{instrumentName(r.symbol)}</span>
                    </span>
                    <PriceFlash value={q?.last} decimals={priceDecimals(r.symbol, q?.last)} className="text-right text-sm font-medium" />
                    <span className={clsx("text-right text-xs vx-tabular", change == null ? "text-muted" : change >= 0 ? "text-buy" : "text-sell")}>
                      {change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/markets" className="block border-t border-line px-5 py-3 text-center text-xs font-medium text-accent hover:bg-raised">
            All markets with charts
          </Link>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <h2 className="mt-3 text-base font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
