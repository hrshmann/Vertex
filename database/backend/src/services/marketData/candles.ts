import { env } from "../../config/env";
import { Instrument } from "../../types";
import { coinbaseFeed, krakenFeed } from "./feeds";

export interface Candle {
  openTime: string; // ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BINANCE_INTERVAL: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
  "1W": "1w",
  "1M": "1M",
};

// Kraken OHLC intervals in minutes; it has no monthly interval.
const KRAKEN_INTERVAL_MINUTES: Record<string, number> = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1H": 60,
  "4H": 240,
  "1D": 1440,
  "1W": 10080,
};

export interface CandleSeries {
  source: string; // provider the candles came from
  isIndicative: boolean;
  candles: Candle[];
}

export class UnsupportedCandleRequest extends Error {}

/**
 * Candle history. Crypto is real-time/historical from Binance's public REST klines endpoint
 * (no API key needed). Forex only supports daily candles, built from Frankfurter's real daily
 * ECB close-rate time series. Forex pairs that Kraken currently quotes live also get intraday
 * candles from Kraken's OHLC endpoint; for the rest, intraday timeframes are refused rather
 * than fabricated. See forexClient.ts and krakenForexClient.ts.
 */
export async function getCandles(
  instrument: Instrument,
  timeframe: string,
  limit = 300
): Promise<CandleSeries> {
  if (instrument.provider === "binance") {
    const interval = BINANCE_INTERVAL[timeframe];
    if (!interval) throw new UnsupportedCandleRequest(`Unsupported timeframe: ${timeframe}`);

    const url = `${env.binanceRestBase}/api/v3/klines?symbol=${instrument.providerSymbol}&interval=${interval}&limit=${Math.min(limit, 1000)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance klines responded ${res.status}`);
    const rows = (await res.json()) as any[];

    // Binance history is in USDT; scale by the live USDT-USD rate so the chart lines up with
    // the USD quotes. (Uses today's rate for all history: the peg moves by fractions of a percent.)
    const usd = coinbaseFeed.usdtUsdRate() ?? 1;
    const candles = rows.map((r) => ({
      openTime: new Date(r[0]).toISOString(),
      open: Number(r[1]) * usd,
      high: Number(r[2]) * usd,
      low: Number(r[3]) * usd,
      close: Number(r[4]) * usd,
      volume: Number(r[5]),
    }));
    return { source: "binance", isIndicative: false, candles };
  }

  const krakenInterval = KRAKEN_INTERVAL_MINUTES[timeframe];
  if (instrument.class === "FOREX" && krakenInterval && krakenFeed.hasFreshQuote(instrument.symbol)) {
    const url = `${env.krakenRestBase}/0/public/OHLC?pair=${encodeURIComponent(instrument.symbol)}&interval=${krakenInterval}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Kraken OHLC responded ${res.status}`);
    const body = (await res.json()) as { error: string[]; result?: Record<string, unknown> };
    if (body.error?.length || !body.result) throw new Error(`Kraken OHLC error: ${body.error?.join(", ")}`);
    const key = Object.keys(body.result).find((k) => k !== "last");
    const rows = (key ? body.result[key] : []) as any[];

    const candles = rows.slice(-limit).map((r) => ({
      openTime: new Date(Number(r[0]) * 1000).toISOString(),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[6]),
    }));
    return { source: "kraken", isIndicative: true, candles };
  }

  if (instrument.provider === "frankfurter") {
    if (timeframe !== "1D") {
      throw new UnsupportedCandleRequest(
        `Intraday candles are not available for ${instrument.symbol}: no live market feed ` +
          `currently covers this pair, and its fallback (the ECB reference rate) is published once ` +
          `a day. Use the 1D timeframe.`
      );
    }
    const [base, quote] = instrument.symbol.split("/");
    const days = Math.min(limit, 365);
    const start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const url = `${env.forexIndicativeBase}/${start}..?from=${base}&to=${quote}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Frankfurter time series responded ${res.status}`);
    const body = (await res.json()) as { rates: Record<string, Record<string, number>> };

    const dates = Object.keys(body.rates).sort();
    const closes = dates.map((d) => body.rates[d][quote]);

    // Frankfurter gives one close per day, not OHLC — so each daily candle's open is the
    // previous day's close, and high/low are the min/max of (open, close). This is an honest
    // approximation of a real daily close series, not a fabricated price.
    const candles = dates.map((d, i) => {
      const close = closes[i];
      const open = i === 0 ? close : closes[i - 1];
      return {
        openTime: new Date(d).toISOString(),
        open,
        high: Math.max(open, close),
        low: Math.min(open, close),
        close,
        volume: 0,
      };
    });
    return { source: "frankfurter", isIndicative: true, candles };
  }

  throw new UnsupportedCandleRequest(`No candle source configured for provider ${instrument.provider}`);
}
