"use client";

import { useState } from "react";
import Link from "next/link";
import { useMarkets } from "@/lib/useMarkets";
import { PriceFlash } from "@/components/PriceFlash";

export default function MarketsPage() {
  const { rows, loading, error } = useMarkets();
  const [tab, setTab] = useState<"ALL" | "FOREX" | "CRYPTO">("ALL");

  const filtered = rows.filter((r) => tab === "ALL" || r.class === tab);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Markets</h1>
          <p className="vx-muted text-sm mt-1">
            Instrument list and pricing are provided live by each instrument's connected market-data source —
            nothing on this page is hard-coded.
          </p>
        </div>
        <div className="flex gap-1 vx-surface-2 rounded-lg p-1">
          {(["ALL", "FOREX", "CRYPTO"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                tab === t ? "bg-vx-accent text-white" : "vx-muted hover:text-[rgb(var(--text))]"
              }`}
            >
              {t === "ALL" ? "All" : t === "FOREX" ? "Forex" : "Crypto"}
            </button>
          ))}
        </div>
      </div>

      <div className="vx-surface rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="vx-surface-2 text-xs uppercase tracking-wide vx-muted">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Instrument</th>
              <th className="text-right px-5 py-3 font-medium">Bid</th>
              <th className="text-right px-5 py-3 font-medium">Ask</th>
              <th className="text-right px-5 py-3 font-medium">Last</th>
              <th className="text-right px-5 py-3 font-medium">24h Change</th>
              <th className="text-right px-5 py-3 font-medium">24h High</th>
              <th className="text-right px-5 py-3 font-medium">24h Low</th>
              <th className="text-right px-5 py-3 font-medium">Source</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {loading && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center vx-muted">
                  Loading instruments…
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const q = r.quote;
              const decimals = r.class === "FOREX" ? 5 : 2;
              const up = (q?.change24hPct ?? 0) >= 0;
              return (
                <tr key={r.symbol} className="hover:bg-[rgb(var(--surface-2))]/40 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium vx-tabular">{r.symbol}</div>
                    <div className="text-[10px] vx-muted uppercase tracking-wide">
                      {r.isExecutable ? "Executable" : "Indicative only"}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right"><PriceFlash value={q?.bid} decimals={decimals} /></td>
                  <td className="px-5 py-3 text-right"><PriceFlash value={q?.ask} decimals={decimals} /></td>
                  <td className="px-5 py-3 text-right font-medium"><PriceFlash value={q?.last} decimals={decimals} /></td>
                  <td className={`px-5 py-3 text-right vx-tabular ${q?.change24hPct == null ? "vx-muted" : up ? "text-vx-buy" : "text-vx-sell"}`}>
                    {q?.change24hPct != null ? `${up ? "+" : ""}${q.change24hPct.toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right vx-tabular vx-muted">{q?.high24h?.toFixed(decimals) ?? "—"}</td>
                  <td className="px-5 py-3 text-right vx-tabular vx-muted">{q?.low24h?.toFixed(decimals) ?? "—"}</td>
                  <td className="px-5 py-3 text-right text-xs vx-muted capitalize">{q?.source ?? r.provider}</td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/terminal?symbol=${encodeURIComponent(r.symbol)}`} className="text-xs text-vx-accent hover:underline">
                      Trade →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <p role="status" className="mt-3 text-sm text-vx-sell">
          Market data could not be refreshed. {rows.length > 0 ? "Showing the last available quotes." : error}
        </p>
      )}

      <p className="mt-4 text-xs vx-muted">
        Forex quotes are indicative, delayed reference rates (not a live order book) until a real-time forex
        data/broker connection is configured. Crypto quotes are live best bid/ask from the connected exchange.
      </p>
    </div>
  );
}
