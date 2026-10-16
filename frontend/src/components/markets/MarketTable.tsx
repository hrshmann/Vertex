"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { formatCompact, priceDecimals } from "@/lib/format";
import { instrumentName, isDailyRate } from "@/lib/instruments";
import { MarketRow } from "@/lib/types";
import { useSparklines } from "@/lib/useSparklines";
import { useWatchlist } from "@/lib/useWatchlist";
import { PriceFlash } from "@/components/PriceFlash";
import { Skeleton } from "@/components/ui/States";
import { AssetIcon, Change, RangeBar, Sparkline, StarButton, usdVolume } from "./parts";

export type MarketFilter = "ALL" | "CRYPTO" | "FOREX" | "WATCH";
type SortKey = "rank" | "symbol" | "price" | "change" | "volume";

const FILTERS: { value: MarketFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "FOREX", label: "Forex" },
  { value: "WATCH", label: "Watchlist" },
];

/**
 * Every market in one dense, sortable, searchable list. Selecting a row calls onSelect; the
 * table itself scrolls when given a height, with its header pinned.
 */
export function MarketTable({
  rows,
  loading,
  selected,
  onSelect,
  className,
  initialFilter = "ALL",
}: {
  rows: MarketRow[];
  loading?: boolean;
  selected?: string;
  onSelect: (symbol: string) => void;
  className?: string;
  initialFilter?: MarketFilter;
}) {
  const sparklines = useSparklines();
  const { watchlist, isWatched, toggle } = useWatchlist();
  const [filter, setFilter] = useState<MarketFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "rank", desc: false });

  const counts = useMemo(
    () => ({
      ALL: rows.length,
      CRYPTO: rows.filter((r) => r.class === "CRYPTO").length,
      FOREX: rows.filter((r) => r.class === "FOREX").length,
      WATCH: rows.filter((r) => watchlist.includes(r.symbol)).length,
    }),
    [rows, watchlist]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (filter === "CRYPTO" && r.class !== "CRYPTO") return false;
      if (filter === "FOREX" && r.class !== "FOREX") return false;
      if (filter === "WATCH" && !watchlist.includes(r.symbol)) return false;
      if (!q) return true;
      return r.symbol.toLowerCase().includes(q) || instrumentName(r.symbol).toLowerCase().includes(q);
    });
    if (sort.key === "rank") return sort.desc ? list.reverse() : list;
    const value = (r: MarketRow): number | string | null => {
      if (sort.key === "symbol") return r.symbol;
      if (sort.key === "price") return r.quote?.last ?? null;
      if (sort.key === "change") return r.quote?.change24hPct ?? null;
      return usdVolume(r);
    };
    return list.slice().sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (va == null) return 1; // markets without a value always sort last
      if (vb == null) return -1;
      const cmp = typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number);
      return sort.desc ? -cmp : cmp;
    });
  }, [rows, filter, query, sort, watchlist]);

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== "symbol" && key !== "rank" }));

  return (
    <div className={clsx("flex min-h-0 flex-col", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <div role="tablist" aria-label="Market type" className="flex gap-0.5 rounded-control bg-raised/70 p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              )}
            >
              {f.label}
              <span className={clsx("font-mono text-[10px]", filter === f.value ? "text-accent" : "text-muted/70")}>{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <label className="relative ml-auto min-w-[9rem] flex-1 sm:max-w-[14rem]">
          <span className="sr-only">Search markets</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search BTC, euro…"
            className="h-8 w-full rounded-control border border-line bg-canvas/60 pl-8 pr-2 text-xs text-ink placeholder:text-muted/70 focus:border-accent/60 focus:outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <colgroup>
            <col className="w-9" />
            <col />
            <col className="w-[7.5rem]" />
            <col className="w-[5rem]" />
            <col className="hidden w-[6.5rem] sm:table-column" />
            <col className="hidden w-[5.5rem] 2xl:table-column" />
            <col className="hidden w-[5.25rem] xl:table-column" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
            <tr>
              <th className="border-b border-line" />
              <SortHeader label="Market" active={sort.key === "symbol"} desc={sort.desc} onClick={() => sortBy("symbol")} />
              <SortHeader label="Price" align="right" active={sort.key === "price"} desc={sort.desc} onClick={() => sortBy("price")} />
              <SortHeader label="24h" align="right" active={sort.key === "change"} desc={sort.desc} onClick={() => sortBy("change")} />
              <th className="hidden border-b border-line px-2 py-2 text-right sm:table-cell">
                <span className="vx-caption">Trend</span>
              </th>
              <th className="hidden border-b border-line px-2 py-2 2xl:table-cell">
                <span className="vx-caption">24h range</span>
              </th>
              <SortHeader label="Volume" align="right" className="hidden xl:table-cell" active={sort.key === "volume"} desc={sort.desc} onClick={() => sortBy("volume")} />
            </tr>
          </thead>
          <tbody>
            {loading &&
              rows.length === 0 &&
              Array.from({ length: 14 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="border-b border-line/60 px-3 py-2.5">
                    <Skeleton className="h-6" />
                  </td>
                </tr>
              ))}
            {visible.map((r) => (
              <Row
                key={r.symbol}
                row={r}
                active={selected === r.symbol}
                watched={isWatched(r.symbol)}
                onToggleWatch={() => toggle(r.symbol)}
                onSelect={() => onSelect(r.symbol)}
                spark={sparklines[r.symbol]}
              />
            ))}
          </tbody>
        </table>
        {!loading && visible.length === 0 && (
          <p className="px-4 py-10 text-center text-xs text-muted">
            {filter === "WATCH" && !query ? "Star a market to add it to your watchlist." : `No markets match “${query}”.`}
          </p>
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  active,
  desc,
  onClick,
  align = "left",
  className,
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onClick: () => void;
  align?: "left" | "right";
  className?: string;
}) {
  const Icon = desc ? ArrowDown : ArrowUp;
  return (
    <th aria-sort={active ? (desc ? "descending" : "ascending") : undefined} className={clsx("border-b border-line px-2 py-2", className)}>
      <button
        type="button"
        onClick={onClick}
        className={clsx("vx-caption flex w-full items-center gap-1 hover:text-ink", align === "right" && "justify-end", active && "!text-ink")}
      >
        {label}
        <Icon className={clsx("h-3 w-3", active ? "opacity-100" : "opacity-0")} aria-hidden />
      </button>
    </th>
  );
}

function Row({
  row,
  active,
  watched,
  onToggleWatch,
  onSelect,
  spark,
}: {
  row: MarketRow;
  active: boolean;
  watched: boolean;
  onToggleWatch: () => void;
  onSelect: () => void;
  spark?: { interval: "1h" | "1d"; points: number[] };
}) {
  const q = row.quote;
  const decimals = priceDecimals(row.symbol, q?.last);
  const daily = isDailyRate(q?.source);
  const cell = clsx("border-b border-line/60 py-1.5 transition-colors", active ? "bg-accent/10" : "group-hover:bg-raised/60");
  return (
    <tr onClick={onSelect} className="group cursor-pointer" aria-selected={active}>
      <td className={clsx(cell, "relative pl-2")}>
        {active && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
        <StarButton active={watched} onClick={onToggleWatch} symbol={row.symbol} />
      </td>
      <td className={clsx(cell, "px-2")}>
        <button type="button" onClick={onSelect} className="flex w-full min-w-0 items-center gap-2.5 text-left focus-visible:outline-offset-0">
          <AssetIcon symbol={row.symbol} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-[13px] font-semibold text-ink">{row.class === "CRYPTO" ? row.symbol.split("/")[0] : row.symbol}</span>
              {daily && <span className="rounded border border-line px-1 font-mono text-[9px] uppercase leading-[14px] text-muted">Daily</span>}
            </span>
            <span className="block truncate text-[11px] leading-4 text-muted">{instrumentName(row.symbol)}</span>
          </span>
        </button>
      </td>
      <td className={clsx(cell, "px-2 text-right")}>
        <PriceFlash value={q?.last} decimals={decimals} className="font-mono text-[13px] font-medium" />
      </td>
      <td className={clsx(cell, "px-2 text-right")}>
        <Change value={q?.change24hPct} className="text-xs" />
      </td>
      <td className={clsx(cell, "hidden px-2 sm:table-cell")}>
        <span className="flex justify-end" title={spark?.interval === "1d" ? "Last 30 days, daily rates" : "Last 24 hours"}>
          <Sparkline points={spark?.points} live={spark?.interval === "1h" ? q?.last : null} width={88} height={26} />
        </span>
      </td>
      <td className={clsx(cell, "hidden px-2 2xl:table-cell")}>
        <RangeBar row={row} />
      </td>
      <td className={clsx(cell, "hidden px-2 pr-3 text-right font-mono text-xs text-muted xl:table-cell")}>{formatCompact(usdVolume(row), "$")}</td>
    </tr>
  );
}
