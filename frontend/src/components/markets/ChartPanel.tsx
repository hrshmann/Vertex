"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, ColorType } from "lightweight-charts";
import { api, ApiRequestError } from "@/lib/api";
import { useMarketSocket } from "@/lib/useMarketSocket";
import { priceDecimals } from "@/lib/format";
import { useTheme } from "@/lib/ThemeContext";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W", "1M"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1H": 3600,
  "4H": 14400,
  "1D": 86400,
  "1W": 604800,
  "1M": 2592000,
};

interface Candle {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Candlestick chart with volume for one market, updated live from price ticks. `dailyOnly`
 * markets (priced from a once-a-day reference rate) only have daily history, so intraday
 * timeframes are disabled for them.
 */
export function ChartPanel({ symbol, dailyOnly = false }: { symbol: string; dailyOnly?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const { theme } = useTheme();
  const [chosen, setTimeframe] = useState<Timeframe>("1H");
  const timeframe: Timeframe = dailyOnly && TIMEFRAME_SECONDS[chosen] < 86_400 ? "1D" : chosen;
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<{ provider: string; isIndicative: boolean } | null>(null);
  const volumeColors = useRef({ up: "rgba(30, 214, 150, 0.3)", down: "rgba(255, 82, 110, 0.3)" });
  const lastBarRef = useRef<{ time: UTCTimestamp; open: number; high: number; low: number; close: number } | null>(
    null
  );

  // Create chart once.
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        fontFamily: getComputedStyle(document.body).getPropertyValue("--font-mono") || "monospace",
        fontSize: 11,
      },
      timeScale: { timeVisible: true },
      crosshair: { mode: 0 },
      autoSize: true,
    });
    const series = chart.addCandlestickSeries({ borderVisible: false });
    series.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.24 } });
    // Volume bars along the bottom fifth, on their own hidden scale.
    const volume = chart.addHistogramSeries({ priceScaleId: "volume", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
    chartRef.current = chart;
    seriesRef.current = series;
    volumeRef.current = volume;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
    };
  }, []);

  // The chart draws on a canvas, so theme colours are read from the CSS variables and reapplied
  // whenever the theme changes.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const css = getComputedStyle(document.documentElement);
    // The chart library only parses comma-separated rgba(), not the CSS "R G B" form.
    const color = (name: string, alpha = 1) => `rgba(${css.getPropertyValue(`--${name}`).trim().split(/\s+/).join(", ")}, ${alpha})`;
    chart.applyOptions({
      layout: { textColor: color("muted") },
      grid: { vertLines: { color: color("line", 0.35) }, horzLines: { color: color("line", 0.35) } },
      rightPriceScale: { borderColor: color("line") },
      timeScale: { borderColor: color("line") },
      crosshair: {
        vertLine: { color: color("accent", 0.5), labelBackgroundColor: color("accent") },
        horzLine: { color: color("accent", 0.5), labelBackgroundColor: color("accent") },
      },
    });
    volumeColors.current = { up: color("buy", 0.3), down: color("sell", 0.3) };
    series.applyOptions({
      upColor: color("buy"),
      downColor: color("sell"),
      wickUpColor: color("buy"),
      wickDownColor: color("sell"),
    });
  }, [theme]);

  // Load candle history whenever symbol/timeframe changes.
  useEffect(() => {
    setError(null);
    lastBarRef.current = null;
    api
      .get<{ candles: Candle[]; provider: string; isIndicative: boolean }>(
        `/api/markets/${encodeURIComponent(symbol)}/candles?timeframe=${timeframe}&limit=300`
      )
      .then((res) => {
        setSource({ provider: res.provider, isIndicative: res.isIndicative });
        const last = res.candles[res.candles.length - 1];
        // The chart defaults to 2 decimals, which would round forex prices to e.g. 1.12.
        const precision = priceDecimals(symbol, last?.close);
        seriesRef.current?.applyOptions({
          priceFormat: { type: "price", precision, minMove: 10 ** -precision },
        });
        if (last) {
          lastBarRef.current = {
            time: (Date.parse(last.openTime) / 1000) as UTCTimestamp,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
          };
        }
        seriesRef.current?.setData(
          res.candles.map((c) => ({
            time: (Date.parse(c.openTime) / 1000) as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );
        const hasVolume = res.candles.some((c) => c.volume > 0);
        volumeRef.current?.setData(
          hasVolume
            ? res.candles.map((c) => ({
                time: (Date.parse(c.openTime) / 1000) as UTCTimestamp,
                value: c.volume,
                color: c.close >= c.open ? volumeColors.current.up : volumeColors.current.down,
              }))
            : []
        );
        chartRef.current?.timeScale().fitContent();
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "Failed to load candles");
        seriesRef.current?.setData([]);
        volumeRef.current?.setData([]);
      });
  }, [symbol, timeframe]);

  // Live-update the current bar from quote ticks.
  useMarketSocket((evt) => {
    if (evt.event !== "market.tick") return;
    const q = evt.data as { symbol: string; last: number; sourceTs: string };
    if (q.symbol !== symbol || !seriesRef.current) return;

    const bucketSeconds = TIMEFRAME_SECONDS[timeframe];
    const tickTime = Math.floor(Date.parse(q.sourceTs) / 1000);
    const bucketStart = Math.floor(tickTime / bucketSeconds) * bucketSeconds;

    const series = seriesRef.current;
    // lightweight-charts doesn't expose "get last bar" publicly in v4's typed API, so we track
    // it ourselves via a ref.
    const last = lastBarRef.current;
    if (last && last.time === bucketStart) {
      const updated = {
        time: bucketStart as UTCTimestamp,
        open: last.open,
        high: Math.max(last.high, q.last),
        low: Math.min(last.low, q.last),
        close: q.last,
      };
      lastBarRef.current = updated;
      series.update(updated);
    } else {
      const bar = { time: bucketStart as UTCTimestamp, open: q.last, high: q.last, low: q.last, close: q.last };
      lastBarRef.current = bar;
      series.update(bar);
    }
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-1.5">
        <div className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1">
          {TIMEFRAMES.map((tf) => {
            const unavailable = dailyOnly && TIMEFRAME_SECONDS[tf] < 86_400;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                disabled={unavailable}
                title={unavailable ? "Only daily rates are available for this pair" : undefined}
                aria-pressed={timeframe === tf}
                className={`shrink-0 rounded-[6px] px-2 py-1 font-mono text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                  timeframe === tf ? "bg-accent/15 text-accent" : "text-muted hover:text-ink"
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>
        {source && (
          <span className="hidden shrink-0 text-2xs text-muted sm:inline">
            Chart data: <span className="capitalize">{source.provider}</span>
            {source.isIndicative && ", indicative"}
          </span>
        )}
      </div>
      <div className="relative min-h-[260px] flex-1">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm vx-muted">
            {error}
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
