"use client";

import clsx from "clsx";
import { Flame, TrendingDown, TrendingUp } from "lucide-react";
import { formatCompact, priceDecimals } from "@/lib/format";
import { MarketRow } from "@/lib/types";
import { useSparklines } from "@/lib/useSparklines";
import { PriceFlash } from "@/components/PriceFlash";
import { AssetIcon, Change, Sparkline, usdVolume } from "./parts";

const COUNT = 6;

/** Biggest gainers, biggest losers and the most traded coins, side by side. */
export function Movers({ rows, onSelect, className }: { rows: MarketRow[]; onSelect: (symbol: string) => void; className?: string }) {
  const priced = rows.filter((r) => r.quote?.change24hPct != null);
  const byChange = priced.slice().sort((a, b) => b.quote!.change24hPct! - a.quote!.change24hPct!);
  const gainers = byChange.filter((r) => r.quote!.change24hPct! > 0).slice(0, COUNT);
  const losers = byChange.filter((r) => r.quote!.change24hPct! < 0).reverse().slice(0, COUNT);
  const active = rows
    .filter((r) => usdVolume(r) != null)
    .sort((a, b) => (usdVolume(b) ?? 0) - (usdVolume(a) ?? 0))
    .slice(0, COUNT);

  return (
    <div className={clsx("grid gap-3 md:grid-cols-3", className)}>
      <List title="Top gainers" icon={<TrendingUp className="h-4 w-4 text-buy" aria-hidden />} rows={gainers} onSelect={onSelect} />
      <List title="Top losers" icon={<TrendingDown className="h-4 w-4 text-sell" aria-hidden />} rows={losers} onSelect={onSelect} />
      <List title="Most traded" icon={<Flame className="h-4 w-4 text-warn" aria-hidden />} rows={active} onSelect={onSelect} showVolume />
    </div>
  );
}

function List({
  title,
  icon,
  rows,
  onSelect,
  showVolume,
}: {
  title: string;
  icon: React.ReactNode;
  rows: MarketRow[];
  onSelect: (symbol: string) => void;
  showVolume?: boolean;
}) {
  const sparklines = useSparklines();
  return (
    <section className="vx-panel overflow-hidden rounded-panel">
      <h2 className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-sm font-semibold">
        {icon}
        {title}
        <span className="ml-auto vx-caption">24h</span>
      </h2>
      <ul>
        {rows.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted">Waiting for prices…</li>}
        {rows.map((r, i) => {
          const spark = sparklines[r.symbol];
          return (
            <li key={r.symbol} style={{ "--i": i } as React.CSSProperties} className="vx-cascade-slide border-b border-line/60 last:border-0">
              <button
                type="button"
                onClick={() => onSelect(r.symbol)}
                className="grid w-full grid-cols-[minmax(0,1fr)_4.5rem_auto] items-center gap-3 px-4 py-2 text-left hover:bg-raised/60"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <AssetIcon symbol={r.symbol} />
                  <span className="min-w-0">
                    <span className="block font-mono text-[13px] font-semibold">{r.class === "CRYPTO" ? r.symbol.split("/")[0] : r.symbol}</span>
                    <PriceFlash value={r.quote?.last} decimals={priceDecimals(r.symbol, r.quote?.last)} className="!px-0 font-mono text-[11px] text-muted" />
                  </span>
                </span>
                <Sparkline points={spark?.points} live={spark?.interval === "1h" ? r.quote?.last : null} width={72} height={24} />
                <span className="text-right">
                  <Change value={r.quote?.change24hPct} pill className="text-xs" />
                  {showVolume && <span className="mt-0.5 block font-mono text-[10px] text-muted">{formatCompact(usdVolume(r), "$")}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
