import { env } from "../../config/env";
import { Instrument } from "../../types";
import { listInstruments } from "./instrumentCache";
import { upsertQuote } from "./quoteCache";
import { ReconnectingSocket } from "./reconnectingSocket";

const USDT_PRODUCT = "USDT-USD";
/** A symbol's Coinbase quote counts as current for this long after its last update. */
const FRESH_MS = 120_000;
/** Coinbase sends a heartbeat per product every second, so 15s of silence means trouble. */
const LIVE_SILENCE_MS = 15_000;

/**
 * Primary crypto feed: Coinbase Exchange's public `ticker` channel (no API key). It quotes
 * real USD order books (BTC-USD, ...), so prices need no stablecoin conversion, and fires on
 * every trade with the current best bid/ask. Binance is the fallback (see binanceClient.ts).
 * Docs: https://docs.cdp.coinbase.com/exchange/websocket-feed/channels
 *
 * It also tracks the USDT-USD rate, used to convert Binance's USDT prices into real USD.
 */
export class CoinbaseMarketDataClient {
  private socket: ReconnectingSocket | null = null;
  private lastQuoteAt = new Map<string, number>();
  private usdtUsd: number | null = null;

  start() {
    const products = new Map<string, Instrument>();
    for (const instrument of listInstruments()) {
      if (instrument.class === "CRYPTO") products.set(`${instrument.baseAsset}-USD`, instrument);
    }
    if (products.size === 0) {
      console.warn("[coinbase] no crypto instruments loaded — skipping connection");
      return;
    }
    const productIds = [...products.keys(), USDT_PRODUCT];
    this.socket = new ReconnectingSocket("coinbase", env.coinbaseWsBase, {
      onOpen: (ws) =>
        ws.send(JSON.stringify({ type: "subscribe", product_ids: productIds, channels: ["ticker", "heartbeat"] })),
      onMessage: (message) => this.handleMessage(message, products),
    });
    this.socket.start();
  }

  stop() {
    this.socket?.stop();
  }

  /** True while Coinbase is connected and has recently quoted `symbol`. */
  hasFreshQuote(symbol: string): boolean {
    return (
      (this.socket?.isLive(LIVE_SILENCE_MS) ?? false) &&
      Date.now() - (this.lastQuoteAt.get(symbol) ?? 0) < FRESH_MS
    );
  }

  /** Latest USDT-USD mid price, or null before the first update. */
  usdtUsdRate(): number | null {
    return this.usdtUsd;
  }

  private async handleMessage(message: any, products: Map<string, Instrument>) {
    if (message.type === "error") {
      console.error("[coinbase] feed error", message.message, message.reason ?? "");
      return;
    }
    if (message.type !== "ticker") return;

    const bid = Number(message.best_bid);
    const ask = Number(message.best_ask);
    if (!(bid > 0 && ask >= bid)) return;

    if (message.product_id === USDT_PRODUCT) {
      this.usdtUsd = (bid + ask) / 2;
      return;
    }
    const instrument = products.get(message.product_id);
    if (!instrument) return;

    const last = Number(message.price);
    const open24h = Number(message.open_24h);
    this.lastQuoteAt.set(instrument.symbol, Date.now());
    await upsertQuote({
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      bid,
      ask,
      last,
      high24h: Number(message.high_24h) || null,
      low24h: Number(message.low_24h) || null,
      volume24h: Number(message.volume_24h) || null,
      change24hPct: open24h > 0 ? ((last - open24h) / open24h) * 100 : null,
      isIndicative: false,
      source: "coinbase",
      sourceTs: message.time ?? new Date().toISOString(),
    });
  }
}
