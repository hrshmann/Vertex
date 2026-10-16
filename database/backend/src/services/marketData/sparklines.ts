import { env } from "../../config/env";
import { Instrument } from "../../types";
import { coinbaseFeed, krakenFeed } from "./feeds";
import { crossRate } from "./forexClient";
import { listInstruments } from "./instrumentCache";

export interface Sparkline {
  /** "1h": hourly closes over the last day. "1d": ECB daily rates over the last month. */
  interval: "1h" | "1d";
  points: number[];
}

const REFRESH_MS = 5 * 60_000;
/** Lets Kraken connect first, so the pairs it streams get intraday lines on the first pass. */
const FIRST_REFRESH_DELAY_MS = 15_000;
const HOURS = 24;
const DAYS = 30;
/** Kraken's public REST API allows about one call a second. */
const KRAKEN_GAP_MS = 1_100;
const BINANCE_CONCURRENCY = 4;

let current: Record<string, Sparkline> = {};

/**
 * Small price-history lines for the market list, one per symbol. They are fetched here on a
 * timer rather than per visitor: one list view would otherwise cost a hundred upstream calls.
 */
export function getSparklines(): Record<string, Sparkline> {
  return current;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return (await res.json()) as T;
}

async function binanceHourly(instrument: Instrument): Promise<number[]> {
  const rows = await getJson<any[]>(
    `${env.binanceRestBase}/api/v3/klines?symbol=${instrument.providerSymbol}&interval=1h&limit=${HOURS}`
  );
  const usd = coinbaseFeed.usdtUsdRate() ?? 1; // USDT closes, scaled to USD like the quotes
  return rows.map((r) => Number(r[4]) * usd);
}

async function krakenHourly(symbol: string): Promise<number[]> {
  const body = await getJson<{ error: string[]; result?: Record<string, unknown> }>(
    `${env.krakenRestBase}/0/public/OHLC?pair=${encodeURIComponent(symbol)}&interval=60`
  );
  if (body.error?.length || !body.result) throw new Error(`Kraken OHLC error: ${body.error?.join(", ")}`);
  const key = Object.keys(body.result).find((k) => k !== "last");
  const rows = (key ? body.result[key] : []) as any[];
  return rows.slice(-HOURS).map((r) => Number(r[4]));
}

/** Daily ECB rates for many pairs from a single request. */
async function ecbDaily(symbols: string[]): Promise<Record<string, number[]>> {
  const start = new Date(Date.now() - (DAYS + 15) * 86_400_000).toISOString().slice(0, 10);
  const body = await getJson<{ rates: Record<string, Record<string, number>> }>(
    `${env.forexIndicativeBase}/${start}..?from=USD`
  );
  const days = Object.keys(body.rates).sort().slice(-DAYS);
  const out: Record<string, number[]> = {};
  for (const symbol of symbols) {
    const points = days.map((d) => crossRate(symbol, body.rates[d])).filter((p): p is number => p != null);
    if (points.length > 1) out[symbol] = points;
  }
  return out;
}

async function refresh() {
  const next: Record<string, Sparkline> = {};
  const instruments = listInstruments();

  const crypto = instruments.filter((i) => i.provider === "binance");
  for (let i = 0; i < crypto.length; i += BINANCE_CONCURRENCY) {
    await Promise.all(
      crypto.slice(i, i + BINANCE_CONCURRENCY).map(async (instrument) => {
        try {
          next[instrument.symbol] = { interval: "1h", points: await binanceHourly(instrument) };
        } catch {
          /* keep the previous line for this symbol */
        }
      })
    );
  }

  const forex = instruments.filter((i) => i.class === "FOREX");
  const daily: string[] = [];
  for (const instrument of forex) {
    if (!krakenFeed.hasFreshQuote(instrument.symbol)) {
      daily.push(instrument.symbol);
      continue;
    }
    try {
      next[instrument.symbol] = { interval: "1h", points: await krakenHourly(instrument.symbol) };
    } catch {
      daily.push(instrument.symbol);
    }
    await sleep(KRAKEN_GAP_MS);
  }
  try {
    for (const [symbol, points] of Object.entries(await ecbDaily(daily))) next[symbol] = { interval: "1d", points };
  } catch (err) {
    console.error("[sparklines] ECB history failed", err);
  }

  current = { ...current, ...next };
}

export function startSparklines() {
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;
  const loop = async () => {
    try {
      await refresh();
    } catch (err) {
      console.error("[sparklines] refresh failed", err);
    }
    if (!stopped) timer = setTimeout(loop, REFRESH_MS);
  };
  timer = setTimeout(loop, FIRST_REFRESH_DELAY_MS);
  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
