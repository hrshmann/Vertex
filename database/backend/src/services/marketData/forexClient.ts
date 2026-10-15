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
 * "Upgrading the forex feed". This client is intentionally swappable: replace its internals,
 * the ForexProvider interface in services/trading stays the same.
 */
const ILLUSTRATIVE_SPREAD_PCT = 0.0006; // ~0.06%, roughly representative of a retail EUR/USD spread

type PairConfig = { symbol: string; invert: boolean };

// All instruments quoted against USD on one side; Frankfurter base=USD gives USD->X rates.
// EUR/USD, GBP/USD, AUD/USD, NZD/USD are conventionally quoted as "how many USD per 1 unit",
// i.e. the inverse of Frankfurter's USD-based rate.
const PAIRS: PairConfig[] = [
  { symbol: "EUR/USD", invert: true },
  { symbol: "GBP/USD", invert: true },
  { symbol: "USD/JPY", invert: false },
  { symbol: "USD/CHF", invert: false },
  { symbol: "AUD/USD", invert: true },
  { symbol: "USD/CAD", invert: false },
  { symbol: "NZD/USD", invert: true },
];

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
    try {
      const targets = ["EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"].join(",");
      const url = `${env.forexIndicativeBase}/latest?from=USD&to=${targets}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Frankfurter responded ${res.status}`);
      const body = (await res.json()) as { date: string; rates: Record<string, number> };

      for (const pair of PAIRS) {
        if (this.primary.hasFreshQuote(pair.symbol)) continue;
        const instrument = listInstruments().find((i) => i.symbol === pair.symbol);
        if (!instrument) continue;
        const [base, quoteCcy] = pair.symbol.split("/");
        const ccyKey = pair.invert ? base : quoteCcy; // the non-USD currency in the pair
        const usdRate = body.rates[ccyKey];
        if (!usdRate) continue;

        const mid = pair.invert ? 1 / usdRate : usdRate;
        const bid = mid * (1 - ILLUSTRATIVE_SPREAD_PCT / 2);
        const ask = mid * (1 + ILLUSTRATIVE_SPREAD_PCT / 2);

        const quote: Quote = {
          instrumentId: instrument.id,
          symbol: instrument.symbol,
          bid,
          ask,
          last: mid,
          high24h: null,
          low24h: null,
          volume24h: null,
          change24hPct: null,
          isIndicative: true,
          source: "frankfurter",
          sourceTs: new Date(body.date).toISOString(),
        };
        await upsertQuote(quote);
      }
    } catch (err) {
      console.error("[forex] poll failed", err);
    }
  }
}
