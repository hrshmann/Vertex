import { env } from "../../config/env";
import { Instrument } from "../../types";
import { listInstruments } from "./instrumentCache";
import { upsertQuote } from "./quoteCache";
import { ReconnectingSocket } from "./reconnectingSocket";

/**
 * Quotes with a wider bid/ask spread are treated as an illiquid market and not published.
 * Kraken's liquid fiat pairs (EUR/USD, GBP/USD, USD/CAD, ...) quote well under 5 bps, while its
 * thin ones (e.g. USD/JPY) can be over 100 bps away from the real market.
 */
const MAX_SPREAD_BPS = 10;
/** A symbol's Kraken quote counts as current for this long after its last accepted update. */
const FRESH_MS = 10 * 60_000;
/** Kraken sends a heartbeat every second while subscribed. */
const LIVE_SILENCE_MS = 15_000;

/**
 * Primary forex feed: Kraken's public v2 `ticker` channel (no API key), which streams real,
 * traded fiat markets with best bid/ask, triggered on every top-of-book change. These are
 * exchange quotes, not interbank/broker liquidity, so forex instruments stay indicative-only.
 * Pairs Kraken doesn't list or quotes too thinly fall back to the daily ECB reference rate
 * (see forexClient.ts).
 * Docs: https://docs.kraken.com/api/docs/websocket-v2/ticker
 */
export class KrakenForexClient {
  private socket: ReconnectingSocket | null = null;
  private lastQuoteAt = new Map<string, number>();

  start() {
    const bySymbol = new Map<string, Instrument>();
    for (const instrument of listInstruments()) {
      if (instrument.class === "FOREX") bySymbol.set(instrument.symbol, instrument);
    }
    if (bySymbol.size === 0) return;

    this.socket = new ReconnectingSocket("kraken", env.krakenWsBase, {
      onOpen: (ws) =>
        ws.send(
          JSON.stringify({
            method: "subscribe",
            params: { channel: "ticker", symbol: [...bySymbol.keys()], event_trigger: "bbo" },
          })
        ),
      onMessage: async (message) => {
        if (message.method === "subscribe" && message.success === false) {
          // Expected for pairs Kraken doesn't list (e.g. NZD/USD); those use the ECB fallback.
          console.warn(`[kraken] not subscribed: ${message.error}`);
          return;
        }
        if (message.channel !== "ticker" || !Array.isArray(message.data)) return;
        for (const ticker of message.data) {
          const instrument = bySymbol.get(ticker.symbol);
          if (instrument) await this.handleTicker(instrument, ticker);
        }
      },
    });
    this.socket.start();
  }

  stop() {
    this.socket?.stop();
  }

  /** True while Kraken is connected and has recently quoted `symbol` with a liquid spread. */
  hasFreshQuote(symbol: string): boolean {
    return (
      (this.socket?.isLive(LIVE_SILENCE_MS) ?? false) &&
      Date.now() - (this.lastQuoteAt.get(symbol) ?? 0) < FRESH_MS
    );
  }

  private async handleTicker(instrument: Instrument, t: any) {
    const bid = Number(t.bid);
    const ask = Number(t.ask);
    if (!(bid > 0 && ask >= bid)) return;
    const mid = (bid + ask) / 2;
    if (((ask - bid) / mid) * 10_000 > MAX_SPREAD_BPS) return;

    this.lastQuoteAt.set(instrument.symbol, Date.now());
    await upsertQuote({
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      bid,
      ask,
      last: Number(t.last) || mid,
      high24h: Number(t.high) || null,
      low24h: Number(t.low) || null,
      volume24h: Number(t.volume) || null,
      change24hPct: Number.isFinite(Number(t.change_pct)) ? Number(t.change_pct) : null,
      isIndicative: true,
      source: "kraken",
      sourceTs: new Date().toISOString(),
    });
  }
}
