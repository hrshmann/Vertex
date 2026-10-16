"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMarkets } from "@/lib/useMarkets";
import { formatCompact, formatPrice, priceDecimals } from "@/lib/format";
import { instrumentName, isDailyRate, sourceName } from "@/lib/instruments";
import { MarketRow } from "@/lib/types";
import { useWatchlist } from "@/lib/useWatchlist";
import { PriceFlash } from "@/components/PriceFlash";
import { Skeleton } from "@/components/ui/States";
import { ChartPanel } from "./ChartPanel";
import { Heatmap } from "./Heatmap";
import { MarketPulse } from "./MarketPulse";
import { MarketTable } from "./MarketTable";
import { Movers } from "./Movers";
import { AssetIcon, Change, RangeBar, StarButton, usdVolume } from "./parts";

/**
 * The price terminal: market-wide figures, every market in a sortable list beside the chart
 * and details of the selected one, then the day's movers and a heatmap. The selection is kept
 * in the URL (?symbol=) so it can be shared.
 */
export function LiveMarkets() {
  const { rows, loading, error } = useMarkets();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const symbol = params.get("symbol") ?? "BTC/USD";
  const selected = rows.find((r) => r.symbol === symbol) ?? rows[0];

  const select = (next: string) => {
    router.replace(`${pathname}?symbol=${encodeURIComponent(next)}`, { scroll: false });
    // The chart sits above the list on phones, and the movers and heatmap sit below it on
    // every screen: bring it into view.
    const chart = document.getElementById("vx-chart");
    if (chart && chart.getBoundingClientRect().top < 0) chart.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (window.matchMedia("(max-width: 1023px)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      <MarketPulse rows={rows} onSelect={select} />

      <div className="grid gap-3 lg:h-[calc(100dvh-15rem)] lg:min-h-[38rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section aria-label="Markets" className="vx-panel order-2 flex h-[34rem] flex-col overflow-hidden rounded-panel lg:order-1 lg:h-auto">
          <MarketTable rows={rows} loading={loading} selected={selected?.symbol} onSelect={select} className="flex-1" />
          {error && (
            <p role="status" className="border-t border-line px-4 py-2 text-xs text-sell">
              Prices couldn't be refreshed. {rows.length > 0 ? "Showing the latest prices received." : "Trying again."}
            </p>
          )}
        </section>

        <section
          id="vx-chart"
          aria-label={selected ? `${selected.symbol} chart` : "Chart"}
          className="vx-panel order-1 flex min-w-0 scroll-mt-20 flex-col overflow-hidden rounded-panel lg:order-2"
        >
          {selected ? <Detail row={selected} /> : <Skeleton className="m-4 h-28" />}
          <div className="h-[360px] border-t border-line sm:h-[420px] lg:h-auto lg:min-h-0 lg:flex-1">{selected && <ChartPanel symbol={selected.symbol} dailyOnly={isDailyRate(selected.quote?.source)} />}</div>
        </section>
      </div>

      <Movers rows={rows} onSelect={select} />
      <Heatmap rows={rows} onSelect={select} />
    </div>
  );
}

function Detail({ row }: { row: MarketRow }) {
  const q = row.quote;
  const { isWatched, toggle } = useWatchlist();
  const decimals = priceDecimals(row.symbol, q?.last);
  const fmt = (v: number | null | undefined) => formatPrice(v, decimals);
  const daily = isDailyRate(q?.source);
  // The daily reference rate has no real bid and ask (the feed adds an illustrative spread).
  const spreadBps = q && q.last && !daily ? ((q.ask - q.bid) / q.last) * 10_000 : null;
  const volume = usdVolume(row);

  return (
    <div className="px-4 pb-3 pt-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AssetIcon symbol={row.symbol} size="lg" />
          <div className="min-w-0">
            <h2 className="flex items-center gap-1 font-mono text-base font-semibold">
              {row.symbol}
              <StarButton active={isWatched(row.symbol)} onClick={() => toggle(row.symbol)} symbol={row.symbol} />
            </h2>
            <p className="truncate text-xs text-muted">{instrumentName(row.symbol)}</p>
          </div>
        </div>
        <LiveLabel row={row} />
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <PriceFlash value={q?.last} decimals={decimals} className="!px-0 font-mono text-[2rem] font-semibold leading-tight tracking-tight" />
        <Change value={q?.change24hPct} pill className="text-sm font-medium" />
        <span className="text-2xs text-muted">{daily ? "since previous rate" : "24 hours"}</span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-2.5 sm:grid-cols-6">
        <Stat label="Bid" value={daily ? "—" : fmt(q?.bid)} tone="sell" />
        <Stat label="Ask" value={daily ? "—" : fmt(q?.ask)} tone="buy" />
        <Stat label="Spread" value={spreadBps == null ? "—" : spreadBps < 0.01 ? "<0.01 bps" : `${spreadBps.toFixed(spreadBps < 10 ? 2 : 1)} bps`} />
        <Stat label="24h high" value={fmt(q?.high24h)} />
        <Stat label="24h low" value={fmt(q?.low24h)} />
        <Stat label="24h volume" value={volume == null ? "—" : formatCompact(volume, "$")} />
      </dl>

      {!daily && q?.low24h != null && (
        <div className="mt-3 flex items-center gap-3 font-mono text-[10px] text-muted">
          <span>L</span>
          <RangeBar row={row} className="flex-1" />
          <span>H</span>
        </div>
      )}
      {daily && (
        <p className="mt-3 rounded-control border border-line bg-raised/50 px-3 py-2 text-2xs text-muted">
          No live market quotes this pair here, so the price is the European Central Bank's daily reference rate, published each business
          day. The chart shows daily rates.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "buy" | "sell" }) {
  return (
    <div className="min-w-0">
      <dt className="vx-caption">{label}</dt>
      <dd className={clsx("mt-0.5 truncate font-mono text-[13px] font-medium", tone === "buy" && "text-buy", tone === "sell" && "text-sell")}>{value}</dd>
    </div>
  );
}

/** Where the price comes from and how fresh it is. */
function LiveLabel({ row }: { row: MarketRow }) {
  const q = row.quote;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!q) return null;
  const age = Math.max(0, Math.round((now - Date.parse(q.sourceTs)) / 1000));
  const daily = isDailyRate(q.source);
  const fresh = !daily && age < 60;
  return (
    <div className="text-right text-2xs text-muted">
      <p
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
          fresh ? "border-buy/30 bg-buy/10 text-buy" : "border-line text-muted"
        )}
      >
        <span className={clsx("h-1.5 w-1.5 rounded-full", fresh ? "animate-pulse bg-buy" : "bg-muted")} aria-hidden />
        {daily ? "Daily rate" : fresh ? "Live" : "Delayed"}
      </p>
      <p className="mt-1">{sourceName(q.source)}</p>
      {!daily && <p className="font-mono">{age < 5 ? "updated just now" : age < 60 ? `updated ${age}s ago` : `updated ${Math.round(age / 60)} min ago`}</p>}
    </div>
  );
}
