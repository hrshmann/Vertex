"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMarkets } from "@/lib/useMarkets";
import { formatPrice, priceDecimals } from "@/lib/format";
import { instrumentName, sourceName } from "@/lib/instruments";
import { MarketRow } from "@/lib/types";
import { PriceFlash } from "@/components/PriceFlash";
import { Skeleton } from "@/components/ui/States";
import { ChartPanel } from "./ChartPanel";

type Filter = "ALL" | "CRYPTO" | "FOREX";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "FOREX", label: "Forex" },
];

/**
 * Live price board: every instrument with its latest price and 24-hour change, and a chart and
 * details for the selected one. The selection is kept in the URL (?symbol=) so it can be shared.
 */
export function LiveMarkets() {
  const { rows, loading, error } = useMarkets();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState<Filter>("ALL");
  const symbol = params.get("symbol") ?? "BTC/USD";
  const selected = rows.find((r) => r.symbol === symbol) ?? rows[0];

  const select = (next: string) => {
    router.replace(`${pathname}?symbol=${encodeURIComponent(next)}`, { scroll: false });
    // On phones the chart sits above the list; bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const visible = rows.filter((r) => filter === "ALL" || r.class === filter);

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <section aria-label="Prices" className="order-2 overflow-hidden rounded-panel border border-line bg-surface lg:order-1">
        <div role="tablist" aria-label="Market type" className="flex gap-1 border-b border-line p-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "flex-1 rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.value ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ul>
          {loading &&
            rows.length === 0 &&
            Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="border-b border-line px-4 py-3.5 last:border-0">
                <Skeleton className="h-6" />
              </li>
            ))}
          {visible.map((r) => (
            <li key={r.symbol} className="border-b border-line last:border-0">
              <PriceRow row={r} active={selected?.symbol === r.symbol} onSelect={() => select(r.symbol)} />
            </li>
          ))}
        </ul>
        {error && (
          <p role="status" className="border-t border-line px-4 py-3 text-xs text-sell">
            Prices couldn't be refreshed. {rows.length > 0 ? "Showing the latest prices received." : "Trying again."}
          </p>
        )}
      </section>

      <section aria-label={selected ? `${selected.symbol} chart` : "Chart"} className="order-1 min-w-0 overflow-hidden rounded-panel border border-line bg-surface lg:sticky lg:top-20 lg:order-2 lg:self-start">
        {selected ? <Detail row={selected} /> : <Skeleton className="m-5 h-24" />}
        <div className="h-[340px] border-t border-line sm:h-[440px]">
          {selected && <ChartPanel symbol={selected.symbol} />}
        </div>
      </section>
    </div>
  );
}

function Change({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value == null) return <span className={clsx("text-muted", className)}>—</span>;
  const up = value >= 0;
  return (
    <span className={clsx("vx-tabular", up ? "text-buy" : "text-sell", className)}>
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function PriceRow({ row, active, onSelect }: { row: MarketRow; active: boolean; onSelect: () => void }) {
  const q = row.quote;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={clsx(
        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
        active ? "bg-accent-soft" : "hover:bg-raised"
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{row.symbol}</span>
        <span className="block truncate text-2xs text-muted">{instrumentName(row.symbol)}</span>
      </span>
      <span className="shrink-0 text-right">
        <PriceFlash value={q?.last} decimals={priceDecimals(row.symbol, q?.last)} className="block text-sm font-medium" />
        <Change value={q?.change24hPct} className="block text-2xs" />
      </span>
    </button>
  );
}

function Detail({ row }: { row: MarketRow }) {
  const q = row.quote;
  const decimals = priceDecimals(row.symbol, q?.last);
  const fmt = (v: number | null | undefined) => formatPrice(v, decimals);
  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">
            {row.symbol} <span className="font-normal text-muted">{instrumentName(row.symbol)}</span>
          </h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <PriceFlash value={q?.last} decimals={decimals} className="text-2xl font-semibold" />
            <Change value={q?.change24hPct} className="text-sm font-medium" />
            <span className="text-xs text-muted">24 hours</span>
          </div>
        </div>
        <LiveLabel row={row} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Stat label="Bid" value={fmt(q?.bid)} />
        <Stat label="Ask" value={fmt(q?.ask)} />
        <Stat label="24h high" value={fmt(q?.high24h)} />
        <Stat label="24h low" value={fmt(q?.low24h)} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium vx-tabular">{value}</dd>
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
  const daily = q.source === "frankfurter";
  const fresh = !daily && age < 60;
  return (
    <div className="text-right text-2xs text-muted">
      <p className="flex items-center justify-end gap-1.5 font-medium text-ink">
        <span className={clsx("h-1.5 w-1.5 rounded-full", fresh ? "animate-pulse bg-buy" : "bg-muted")} aria-hidden />
        {daily ? "Daily reference rate" : fresh ? "Live" : "Delayed"}
      </p>
      <p className="mt-0.5">{sourceName(q.source)}</p>
      {!daily && <p>{age < 5 ? "Updated just now" : age < 60 ? `Updated ${age}s ago` : `Updated ${Math.round(age / 60)} min ago`}</p>}
    </div>
  );
}
