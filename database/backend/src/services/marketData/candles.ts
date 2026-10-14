import { env } from "../../config/env";
import { Instrument } from "../../types";

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

export class UnsupportedCandleRequest extends Error {}

/**
 * Candle history. Crypto is real-time/historical from Binance's public REST klines endpoint
 * (no API key needed). Forex only supports daily candles, built from Frankfurter's real daily
 * ECB close-rate time series — there is no free, keyless source of intraday forex OHLC, so
 * intraday forex timeframes are refused rather than fabricated. See forexClient.ts.
 */
export async function getCandles(
  instrument: Instrument,
  timeframe: string,
  limit = 300
): Promise<Candle[]> {
  if (instrument.provider === "binance") {
    const interval = BINANCE_INTERVAL[timeframe];
    if (!interval) throw new UnsupportedCandleRequest(`Unsupported timeframe: ${timeframe}`);

    const url = `${env.binanceRestBase}/api/v3/klines?symbol=${instrument.providerSymbol}&interval=${interval}&limit=${Math.min(limit, 1000)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance klines responded ${res.status}`);
    const rows = (await res.json()) as any[];

    return rows.map((r) => ({
      openTime: new Date(r[0]).toISOString(),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    }));
  }

  if (instrument.provider === "frankfurter") {
    if (timeframe !== "1D") {
      throw new UnsupportedCandleRequest(
        `Intraday candles are not available for ${instrument.symbol}: the free indicative ` +
          `forex feed (Frankfurter.app) only publishes one daily reference rate. A real-time ` +
          `forex data provider is required for ${timeframe} candles — see backend/README.md.`
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
    return dates.map((d, i) => {
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
  }

  throw new UnsupportedCandleRequest(`No candle source configured for provider ${instrument.provider}`);
}
