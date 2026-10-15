import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const TOPICS = [
  {
    title: "Forex trading",
    body: "Trade currency pairs like EUR/USD or GBP/USD, speculating on the relative value of one currency against another.",
  },
  {
    title: "Crypto trading",
    body: "Trade major cryptocurrencies such as BTC, ETH and SOL against USD, with live pricing streamed from the connected exchange.",
  },
  {
    title: "Market orders",
    body: "Executed immediately at the current best available price — the fastest way in or out of a position.",
  },
  {
    title: "Limit orders",
    body: "Executed only at your specified price or better. A buy limit fills at or below your price; a sell limit fills at or above it.",
  },
  {
    title: "Stop orders",
    body: "Become a market order once the market reaches your stop price — commonly used to enter breakouts or exit losing trades.",
  },
  {
    title: "Stop Loss",
    body: "An optional price on a position that automatically closes it to cap further loss if the market moves against you.",
  },
  {
    title: "Take Profit",
    body: "An optional price on a position that automatically closes it to lock in gains once the market moves in your favor.",
  },
  {
    title: "Real-time charts",
    body: "Candlestick charts with multiple timeframes and indicators, updating live as new prices arrive over WebSocket.",
  },
];

export default function TradingExplainerPage() {
  return (
    <div>
      <PageHeader
        title="Trading on Vertex"
        subtitle="The order types, tools and mechanics behind the Vertex trading terminal."
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 gap-5">
          {TOPICS.map((t) => (
            <div key={t.title} className="vx-surface rounded-xl p-5">
              <div className="font-medium mb-2">{t.title}</div>
              <p className="text-sm vx-muted leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex gap-3">
          <Link href="/terminal" className="rounded-lg bg-vx-accent px-6 py-3 text-sm font-medium text-white">
            Open the trading terminal →
          </Link>
          <Link href="/education" className="rounded-lg vx-surface-2 px-6 py-3 text-sm font-medium">
            Learn the fundamentals
          </Link>
        </div>
      </div>
    </div>
  );
}
