"use client";

import clsx from "clsx";
import { Activity } from "lucide-react";
import { formatCompact, formatPrice, priceDecimals } from "@/lib/format";
import { MarketRow } from "@/lib/types";
import { AssetIcon, Change, usdVolume } from "./parts";

/**
 * One line of market-wide figures: how many markets are up or down, the best and worst
 * performers, total crypto volume and the average crypto move.
 */
export function MarketPulse({ rows, onSelect, className }: { rows: MarketRow[]; onSelect?: (symbol: string) => void; className?: string }) {
  const priced = rows.filter((r) => r.quote?.change24hPct != null);
  const up = priced.filter((r) => (r.quote?.change24hPct ?? 0) > 0).length;
  const down = priced.filter((r) => (r.quote?.change24hPct ?? 0) < 0).length;
  const sorted = priced.slice().sort((a, b) => (b.quote!.change24hPct ?? 0) - (a.quote!.change24hPct ?? 0));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const crypto = rows.filter((r) => r.class === "CRYPTO" && r.quote);
  const volume = crypto.reduce((sum, r) => sum + (usdVolume(r) ?? 0), 0);
  const cryptoChanges = crypto.map((r) => r.quote?.change24hPct).filter((c): c is number => c != null);
  const avg = cryptoChanges.length ? cryptoChanges.reduce((a, b) => a + b, 0) / cryptoChanges.length : null;
  const live = rows.filter((r) => r.quote && r.quote.source !== "frankfurter").length;

  return (
    <div className={clsx("vx-panel grid grid-cols-2 divide-line overflow-hidden rounded-panel sm:grid-cols-3 lg:grid-cols-6 lg:divide-x", className)}>
      <Cell label="Markets">
        <span className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" aria-hidden />
          <span className="font-mono text-base font-semibold">{rows.length || "—"}</span>
          <span className="text-2xs text-muted">{live} streaming</span>
        </span>
      </Cell>
      <Cell label="Breadth (24h)">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-buy">{up}▲</span>
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-sell/70">
            <span className="absolute inset-y-0 left-0 rounded-full bg-buy" style={{ width: `${up + down ? (up / (up + down)) * 100 : 50}%` }} />
          </span>
          <span className="text-sell">{down}▼</span>
        </div>
      </Cell>
      <Mover label="Top gainer" row={best} onSelect={onSelect} />
      <Mover label="Top loser" row={worst} onSelect={onSelect} />
      <Cell label="Crypto volume (24h)">
        <span className="font-mono text-base font-semibold">{volume ? formatCompact(volume, "$") : "—"}</span>
      </Cell>
      <Cell label="Avg crypto move">
        <Change value={avg} className="text-base font-semibold" />
      </Cell>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 border-b border-line/60 px-4 py-2.5 lg:border-b-0">
      <p className="vx-caption mb-1 truncate">{label}</p>
      {children}
    </div>
  );
}

function Mover({ label, row, onSelect }: { label: string; row?: MarketRow; onSelect?: (symbol: string) => void }) {
  return (
    <Cell label={label}>
      {row ? (
        <button type="button" onClick={() => onSelect?.(row.symbol)} className="flex min-w-0 items-center gap-2 text-left hover:opacity-80">
          <AssetIcon symbol={row.symbol} />
          <span className="truncate font-mono text-xs font-semibold">{row.class === "CRYPTO" ? row.symbol.split("/")[0] : row.symbol}</span>
          <span className="hidden font-mono text-xs text-muted 2xl:inline">{formatPrice(row.quote?.last, priceDecimals(row.symbol, row.quote?.last))}</span>
          <Change value={row.quote?.change24hPct} className="text-xs" />
        </button>
      ) : (
        <span className="text-muted">—</span>
      )}
    </Cell>
  );
}
