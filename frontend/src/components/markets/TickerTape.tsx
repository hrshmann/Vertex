"use client";

import Link from "next/link";
import clsx from "clsx";
import { formatPrice, priceDecimals } from "@/lib/format";
import { useMarkets } from "@/lib/useMarkets";
import { AssetIcon, Change } from "./parts";

/**
 * A scrolling strip of live prices across the top of a page. The list is rendered twice and
 * slides by one copy's width, so it loops without a seam; hovering pauses it.
 */
export function TickerTape({ href = "/markets", limit = 40, className }: { href?: string; limit?: number; className?: string }) {
  const { rows } = useMarkets();
  const items = rows.filter((r) => r.quote).slice(0, limit);

  return (
    <div className={clsx("relative h-9 overflow-hidden border-b border-line bg-surface/70 backdrop-blur", className)}>
      {items.length > 0 && (
        <div className="vx-marquee flex w-max" style={{ "--vx-marquee-duration": `${items.length * 3}s` } as React.CSSProperties}>
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0" aria-hidden={copy === 1 || undefined}>
              {items.map((r) => (
                <li key={r.symbol}>
                  <Link
                    href={`${href}?symbol=${encodeURIComponent(r.symbol)}`}
                    tabIndex={copy === 1 ? -1 : undefined}
                    className="flex h-9 items-center gap-2 border-r border-line/60 px-4 text-xs hover:bg-raised/60"
                  >
                    <AssetIcon symbol={r.symbol} />
                    <span className="font-mono font-semibold text-ink">{r.class === "CRYPTO" ? r.symbol.split("/")[0] : r.symbol}</span>
                    <span className="font-mono text-ink/80">{formatPrice(r.quote?.last, priceDecimals(r.symbol, r.quote?.last))}</span>
                    <Change value={r.quote?.change24hPct} />
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      )}
      {/* Fade both edges into the background. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-canvas to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-canvas to-transparent" />
    </div>
  );
}
