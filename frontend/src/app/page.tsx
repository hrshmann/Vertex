"use client";

import Link from "next/link";
import { useMarkets } from "@/lib/useMarkets";
import { PriceFlash } from "@/components/PriceFlash";
import { priceDecimals } from "@/lib/format";
import { useAuth } from "@/lib/AuthContext";

const FEATURES = [
  { title: "Real-time market data", body: "Live crypto pricing streamed over WebSockets, with every quote labeled by source and timestamp." },
  { title: "Professional order types", body: "Market, Limit, Stop and Stop-Limit orders with Stop Loss and Take Profit on every position." },
  { title: "Transparent execution", body: "Orders route through an auditable order-management layer — never a black box." },
  { title: "Built-in risk controls", body: "Server-enforced margin requirements, margin-call and stop-out rules protect your account." },
];

export default function HomePage() {
  const { rows } = useMarkets();
  const { user } = useAuth();
  const forex = rows.filter((r) => r.class === "FOREX").slice(0, 7);
  const crypto = rows.filter((r) => r.class === "CRYPTO").slice(0, 5);

  return (
    <div>
      <section className="relative overflow-hidden bg-vx-radial">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full vx-surface-2 px-3 py-1 text-xs vx-muted mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-vx-buy animate-pulse" />
              Live markets — demo trading account
            </span>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Trade global markets with <span className="text-vx-accent">Vertex</span>
            </h1>
            <p className="mt-6 text-lg vx-muted max-w-xl leading-relaxed">
              Trade Forex, Crypto and other supported financial instruments through a professional
              trading platform with real-time market data.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-lg bg-vx-accent px-6 py-3 text-sm font-medium text-white hover:bg-vx-accent/90 transition-colors">
                Open Account
              </Link>
              <Link href="/login" className="rounded-lg vx-surface-2 px-6 py-3 text-sm font-medium hover:bg-[rgb(var(--border))] transition-colors">
                Login
              </Link>
              <Link href={user ? "/terminal" : "/register"} className="rounded-lg px-6 py-3 text-sm font-medium border border-[rgb(var(--border))] hover:border-vx-accent transition-colors">
                Start Trading →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid md:grid-cols-2 gap-5">
          <TickerCard title="Popular Forex Pairs" rows={forex} />
          <TickerCard title="Crypto Prices" rows={crypto} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-[rgb(var(--border))]">
        <h2 className="text-2xl font-semibold mb-8">Platform features</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="vx-surface rounded-xl p-5">
              <div className="font-medium mb-2">{f.title}</div>
              <p className="text-sm vx-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TickerCard({ title, rows }: { title: string; rows: ReturnType<typeof useMarkets>["rows"] }) {
  return (
    <div className="vx-surface rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[rgb(var(--border))] flex items-center justify-between">
        <span className="font-medium">{title}</span>
        <Link href="/markets" className="text-xs text-vx-accent hover:underline">
          View all markets →
        </Link>
      </div>
      <div className="divide-y divide-[rgb(var(--border))]">
        {rows.length === 0 && (
          <div className="px-5 py-6 text-sm vx-muted">Connecting to live market data…</div>
        )}
        {rows.map((r) => {
          const q = r.quote;
          const up = (q?.change24hPct ?? 0) >= 0;
          return (
            <div key={r.symbol} className="px-5 py-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium vx-tabular">{r.symbol}</div>
                {!r.isExecutable && <div className="text-[10px] vx-muted uppercase tracking-wide">indicative</div>}
              </div>
              <div className="flex items-center gap-4">
                <PriceFlash value={q?.last} decimals={priceDecimals(r.symbol, q?.last)} className="font-medium" />
                {q?.change24hPct != null && (
                  <span className={up ? "text-vx-buy text-xs vx-tabular" : "text-vx-sell text-xs vx-tabular"}>
                    {up ? "+" : ""}
                    {q.change24hPct.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
