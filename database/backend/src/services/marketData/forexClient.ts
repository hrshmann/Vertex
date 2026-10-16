import { env } from "../../config/env";
import { Quote } from "../../types";
import { listInstruments } from "./instrumentCache";
import { upsertQuote } from "./quoteCache";

export interface ForexPrimaryFeed {
  hasFreshQuote(symbol: string): boolean;
}

/**
 * Fallback forex rates from Frankfurter — free, keyless, ECB daily reference rates.
 * https://frankfurter.dev (open-source, no API key, no signup).
 *
 * Only used for pairs the primary live feed (Kraken, see krakenForexClient.ts) has no current
 * quote for: pairs it doesn't list or quotes too thinly, or any pair while it is down.
 *
 * IMPORTANT — this is NOT real-time, executable market data:
 *  - ECB publishes reference rates once per business day (~16:00 CET), not streaming ticks.
 *  - Frankfurter has no order book, so there is no real bid/ask: this client synthesizes a
 *    small illustrative spread around the published mid rate purely for UI display.
 *  - Every forex instrument is seeded with is_executable = false, and every quote this client
 *    produces is marked isIndicative = true end-to-end (API response, WS event, UI).
 *
 * To get real-time, executable forex pricing, connect a licensed forex data/broker API
 * (e.g. a broker that offers a demo/live REST+WS feed with an API key) — see backend/README.md
 * "Upgrading the forex feed".
 *
 * Every listed forex pair is derived from one USD-based rate table (GBP/JPY = JPY per USD ÷ GBP
 * per USD), so a pair can be listed as long as the ECB publishes both of its currencies.
 */
const ILLUSTRATIVE_SPREAD_PCT = 0.0006; // ~0.06%, roughly representative of a retail EUR/USD spread

/** Enough calendar days to span two ECB publications across weekends and holidays. */
const HISTORY_DAYS = 10;

/**
 * The rate of `pair` (e.g. "GBP/JPY": yen per pound) from one day's USD-based rates, or null if
 * the ECB doesn't publish either currency.
 */
export function crossRate(pair: string, usdRates: Record<string, number>): number | null {
  const [base, quote] = pair.split("/");
  const perUsd = (ccy: string) => (ccy === "USD" ? 1 : usdRates[ccy]);
  const b = perUsd(base);
  const q = perUsd(quote);
  return b > 0 && q > 0 ? q / b : null;
}

export class ForexIndicativeClient {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly primary: ForexPrimaryFeed) {}

  start() {
    this.pollOnce();
    this.timer = setInterval(() => this.pollOnce(), env.forexPollIntervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  private async pollOnce() {
    const instruments = listInstruments().filter((i) => i.class === "FOREX");
    if (instruments.length === 0) return;
    try {
      // The last ~10 days of USD-based rates: the latest publication is the price, and the one
      // before it gives the day-over-day change.
      const start = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
      const res = await fetch(`${env.forexIndicativeBase}/${start}..?from=USD`);
      if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`);
      const body = (await res.json()) as { rates: Record<string, Record<string, number>> };
      const dates = Object.keys(body.rates).sort();
      const latestDate = dates[dates.length - 1];
      if (!latestDate) return;
      const latest = body.rates[latestDate];
      const previous = dates.length > 1 ? body.rates[dates[dates.length - 2]] : null;

      for (const instrument of instruments) {
        if (this.primary.hasFreshQuote(instrument.symbol)) continue;
        const mid = crossRate(instrument.symbol, latest);
        if (!mid) continue;
        const prev = previous ? crossRate(instrument.symbol, previous) : null;

        const quote: Quote = {
          instrumentId: instrument.id,
          symbol: instrument.symbol,
          bid: mid * (1 - ILLUSTRATIVE_SPREAD_PCT / 2),
          ask: mid * (1 + ILLUSTRATIVE_SPREAD_PCT / 2),
          last: mid,
          high24h: null,
          low24h: null,
          volume24h: null,
          // Change since the previous ECB publication (usually the previous business day).
          change24hPct: prev ? ((mid - prev) / prev) * 100 : null,
          isIndicative: true,
          source: "frankfurter",
          sourceTs: new Date(latestDate).toISOString(),
        };
        await upsertQuote(quote);
      }
    } catch (err) {
      console.error("[forex] poll failed", err);
    }
  }
}
