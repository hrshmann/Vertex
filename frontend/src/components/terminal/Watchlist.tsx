"use client";

import { useMarkets } from "@/lib/useMarkets";
import { PriceFlash } from "@/components/PriceFlash";
import clsx from "clsx";

export function Watchlist({ selected, onSelect }: { selected: string; onSelect: (symbol: string) => void }) {
  const { rows } = useMarkets();

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2.5 border-b border-[rgb(var(--border))] text-xs font-medium vx-muted uppercase tracking-wide">
        Watchlist
      </div>
      <div className="flex-1 overflow-y-auto">
        {rows.map((r) => {
          const q = r.quote;
          const decimals = r.class === "FOREX" ? 5 : 2;
          const up = (q?.change24hPct ?? 0) >= 0;
          return (
            <button
              key={r.symbol}
              onClick={() => onSelect(r.symbol)}
              className={clsx(
                "w-full flex items-center justify-between px-3 py-2.5 text-left border-b border-[rgb(var(--border))]/60 transition-colors",
                selected === r.symbol ? "bg-vx-accent/10" : "hover:bg-[rgb(var(--surface-2))]/60"
              )}
            >
              <div>
                <div className="text-sm font-medium vx-tabular">{r.symbol}</div>
                <div className="text-[10px] vx-muted">{r.isExecutable ? r.provider : "indicative"}</div>
              </div>
              <div className="text-right">
                <PriceFlash value={q?.last} decimals={decimals} className="text-sm font-medium" />
                {q?.change24hPct != null && (
                  <div className={clsx("text-[11px] vx-tabular", up ? "text-vx-buy" : "text-vx-sell")}>
                    {up ? "+" : ""}
                    {q.change24hPct.toFixed(2)}%
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
