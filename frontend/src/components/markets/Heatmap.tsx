"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { formatPrice, priceDecimals } from "@/lib/format";
import { MarketRow } from "@/lib/types";
import { AssetIcon } from "./parts";

/** Small tiles are at least this wide (px). */
const MIN_TILE_PX = 88;
/** The largest markets get big tiles in a row of their own. */
const LEAD_TILES = 8;

/** A move this large (in %) or more gets the strongest colour. */
const FULL_SCALE_PCT = { CRYPTO: 8, FOREX: 1 } as const;

/**
 * Every market as a tile coloured by its 24-hour move, largest markets first and biggest.
 * Forex moves are a fraction of crypto's, so each class has its own colour scale.
 */
export function Heatmap({ rows, onSelect, className }: { rows: MarketRow[]; onSelect: (symbol: string) => void; className?: string }) {
  const [kind, setKind] = useState<"CRYPTO" | "FOREX">("CRYPTO");
  const tiles = rows.filter((r) => r.class === kind);
  const lead = tiles.slice(0, LEAD_TILES);
  const rest = tiles.slice(LEAD_TILES);

  // Spread the small tiles over the fewest rows, with the same number in each row (give or take
  // one), so the last row doesn't end with a lone stretched tile or a gap.
  const gridRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const maxPerRow = Math.max(3, Math.floor(width / MIN_TILE_PX));
  const perRow = Math.ceil(rest.length / Math.max(1, Math.ceil(rest.length / maxPerRow)));

  return (
    <section aria-label="Heatmap" className={clsx("vx-panel overflow-hidden rounded-panel", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">Market heatmap</h2>
          <p className="text-2xs text-muted">24h change · scale ±{FULL_SCALE_PCT[kind]}%</p>
        </div>
        <div role="tablist" aria-label="Heatmap market type" className="flex gap-0.5 rounded-control bg-raised/70 p-0.5">
          {(["CRYPTO", "FOREX"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={clsx("rounded-[6px] px-2.5 py-1 text-xs font-medium", kind === k ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
            >
              {k === "CRYPTO" ? "Crypto" : "Forex"}
            </button>
          ))}
        </div>
      </header>
      <div className="space-y-px bg-line/60 p-px">
        <div className="flex flex-wrap gap-px">
          {lead.map((r, i) => (
            <Tile key={r.symbol} row={r} size={i < 2 ? "xl" : "wide"} scale={FULL_SCALE_PCT[kind]} onSelect={onSelect} />
          ))}
        </div>
        <div ref={gridRef} className="flex flex-wrap gap-px">
          {rest.map((r) => (
            <Tile key={r.symbol} row={r} size="normal" scale={FULL_SCALE_PCT[kind]} onSelect={onSelect} basis={`calc(${100 / perRow}% - 1px)`} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Tile({
  row,
  size,
  scale,
  onSelect,
  basis,
}: {
  row: MarketRow;
  size: "xl" | "wide" | "normal";
  scale: number;
  onSelect: (symbol: string) => void;
  basis?: string;
}) {
  const change = row.quote?.change24hPct;
  const strength = change == null ? 0 : Math.min(1, Math.abs(change) / scale);
  const tone = change == null || change === 0 ? null : change > 0 ? "buy" : "sell";
  const background = tone ? `rgb(var(--${tone}) / ${(0.1 + strength * 0.62).toFixed(3)})` : "rgb(var(--raised))";
  const label = row.class === "CRYPTO" ? row.symbol.split("/")[0] : row.symbol;
  return (
    <button
      type="button"
      onClick={() => onSelect(row.symbol)}
      title={`${row.symbol} ${change == null ? "" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}`}
      style={{ background, flexBasis: basis }}
      className={clsx(
        "group relative flex min-w-0 grow flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center transition-[filter] hover:brightness-125",
        size === "xl" && "h-[5.5rem] basis-[45%] sm:h-[7.5rem] sm:basis-[13rem]",
        size === "wide" && "h-[3.75rem] basis-[30%] sm:h-[7.5rem] sm:basis-[8rem]",
        size === "normal" && "h-[3.75rem]"
      )}
    >
      {size === "xl" && (
        <span className="hidden sm:block">
          <AssetIcon symbol={row.symbol} size="md" />
        </span>
      )}
      <span className={clsx("truncate font-mono font-semibold text-ink", size === "xl" ? "text-base" : "text-xs")}>{label}</span>
      <span className={clsx("font-mono text-ink/90", size === "xl" ? "text-sm" : "text-[11px]")}>
        {change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
      </span>
      {size !== "normal" && (
        <span className="font-mono text-[10px] text-ink/60">{formatPrice(row.quote?.last, priceDecimals(row.symbol, row.quote?.last))}</span>
      )}
    </button>
  );
}
