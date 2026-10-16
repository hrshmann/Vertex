"use client";

import clsx from "clsx";
import { useId } from "react";
import { Star } from "lucide-react";
import { COIN_LOGOS, CURRENCIES } from "@/lib/instruments";
import { MarketRow } from "@/lib/types";

/** A stable hue per code, so a coin's generated badge is always the same colour. */
function hue(code: string): number {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function Monogram({ code, label, className }: { code: string; label: string; className?: string }) {
  return (
    <span
      style={{ "--h": hue(code) } as React.CSSProperties}
      className={clsx("vx-monogram flex items-center justify-center rounded-full font-mono font-semibold leading-none", className)}
    >
      {label}
    </span>
  );
}

const ICON_SIZES = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" } as const;
const MONOGRAM_TEXT = { sm: "text-[8px]", md: "text-[10px]", lg: "text-xs" } as const;

/** Coin logo, a generated badge for coins without one, or a pair of currency signs for forex. */
export function AssetIcon({ symbol, size = "sm" }: { symbol: string; size?: keyof typeof ICON_SIZES }) {
  const [base, quote] = symbol.split("/");
  if (CURRENCIES[base] && CURRENCIES[quote]) {
    const text = { sm: "text-[8px]", md: "text-[10px]", lg: "text-[11px]" }[size];
    return (
      <span aria-hidden className={clsx("relative block shrink-0", ICON_SIZES[size])}>
        <Monogram code={quote} label={CURRENCIES[quote].sign} className={clsx("absolute bottom-0 right-0 h-[68%] w-[68%] opacity-80", text)} />
        <Monogram code={base} label={CURRENCIES[base].sign} className={clsx("absolute left-0 top-0 h-[68%] w-[68%] ring-2 ring-surface", text)} />
      </span>
    );
  }
  if (COIN_LOGOS.has(base)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/coins/${base.toLowerCase()}.webp`} alt="" loading="lazy" className={clsx("shrink-0 rounded-full", ICON_SIZES[size])} />;
  }
  return <Monogram code={base} label={base.slice(0, 4)} className={clsx("shrink-0", ICON_SIZES[size], MONOGRAM_TEXT[size])} />;
}

/** Signed percentage, green or red. `pill` adds a tinted background. */
export function Change({ value, pill, className }: { value: number | null | undefined; pill?: boolean; className?: string }) {
  if (value == null || !Number.isFinite(value)) return <span className={clsx("font-mono text-muted", className)}>—</span>;
  const up = value >= 0;
  return (
    <span
      className={clsx(
        "font-mono tabular-nums",
        up ? "text-buy" : "text-sell",
        pill && "inline-block rounded-[5px] px-1.5 py-0.5",
        pill && (up ? "bg-buy/10" : "bg-sell/10"),
        className
      )}
    >
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

/**
 * A small trend line. `live` replaces the last point with the current price, so the line ends
 * where the price is now. Green when the line ends higher than it starts.
 */
export function Sparkline({
  points,
  live,
  className,
  width = 96,
  height = 28,
}: {
  points: number[] | undefined;
  live?: number | null;
  className?: string;
  width?: number;
  height?: number;
}) {
  const gradientId = `vx-spark-${useId().replace(/:/g, "")}`;
  if (!points || points.length < 2) return <span aria-hidden className={clsx("block", className)} style={{ width, height }} />;
  const data = live != null && Number.isFinite(live) ? [...points.slice(0, -1), live] : points;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const coords = data.map((v, i) => [i * step, height - 2 - ((v - min) / span) * (height - 4)] as const);
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  const color = up ? "rgb(var(--buy))" : "rgb(var(--sell))";
  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={clsx("block overflow-visible", className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${line} ${width},${height}`} fill={`url(#${gradientId})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Where the price sits between the 24-hour low and high. */
export function RangeBar({ row, className }: { row: MarketRow; className?: string }) {
  const q = row.quote;
  if (!q || q.low24h == null || q.high24h == null || q.high24h <= q.low24h) {
    return <span className={clsx("block text-center font-mono text-2xs text-muted", className)}>—</span>;
  }
  const pos = Math.min(1, Math.max(0, (q.last - q.low24h) / (q.high24h - q.low24h)));
  return (
    <span className={clsx("relative block h-1.5 rounded-full bg-raised", className)} title={`${Math.round(pos * 100)}% of the 24h range`}>
      <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sell/50 via-warn/40 to-buy/60" style={{ width: `${pos * 100}%` }} />
      <span className="absolute top-1/2 h-2.5 w-[3px] -translate-y-1/2 rounded-full bg-ink" style={{ left: `calc(${pos * 100}% - 1.5px)` }} />
    </span>
  );
}

export function StarButton({ active, onClick, symbol }: { active: boolean; onClick: () => void; symbol: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      className={clsx("flex h-6 w-6 items-center justify-center rounded transition-colors", active ? "text-warn" : "text-muted/50 hover:text-muted")}
    >
      <Star className="h-3.5 w-3.5" fill={active ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}

/** 24-hour traded value in USD, for crypto (forex venues here don't report comparable volume). */
export function usdVolume(row: MarketRow): number | null {
  const q = row.quote;
  if (row.class !== "CRYPTO" || !q || q.volume24h == null) return null;
  return q.volume24h * q.last;
}
