import WebSocket from "ws";
import { env } from "../../config/env";
import { Quote } from "../../types";
import { listInstruments } from "./instrumentCache";
import { upsertQuote } from "./quoteCache";

/**
 * Live crypto market data from Binance's public 24hr-ticker WebSocket stream.
 * No API key required for public market data. Source: https://binance-docs.github.io/apidocs/spot/en/#individual-symbol-ticker-streams
 *
 * This is real, executable-grade exchange data — distinct from the forex feed, which is
 * an indicative-only daily reference rate (see forexClient.ts).
 */
export class BinanceMarketDataClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelayMs = 1000;
  private readonly maxReconnectDelayMs = 30_000;
  private stopped = false;

  start() {
    const cryptoInstruments = listInstruments().filter((i) => i.provider === "binance");
    if (cryptoInstruments.length === 0) {
      console.warn("[binance] no crypto instruments loaded — skipping connection");
      return;
    }
    const streams = cryptoInstruments
      .map((i) => `${i.providerSymbol.toLowerCase()}@ticker`)
      .join("/");
    this.connect(streams);
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  private connect(streams: string) {
    if (this.stopped) return;
    const url = `${env.binanceWsBase}/stream?streams=${streams}`;
    console.log(`[binance] connecting: ${url}`);
    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      console.log("[binance] connected");
      this.reconnectDelayMs = 1000;
    });

    this.ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const payload = msg.data;
        if (!payload || payload.e !== "24hrTicker") return;
        this.handleTicker(payload);
      } catch (err) {
        console.error("[binance] failed to parse message", err);
      }
    });

    this.ws.on("close", () => {
      if (this.stopped) return;
      console.warn(`[binance] disconnected, reconnecting in ${this.reconnectDelayMs}ms`);
      this.reconnectTimer = setTimeout(() => this.connect(streams), this.reconnectDelayMs);
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, this.maxReconnectDelayMs);
    });

    this.ws.on("error", (err) => {
      console.error("[binance] socket error", err.message);
    });
  }

  private async handleTicker(t: any) {
    const instrument = listInstruments().find(
      (i) => i.provider === "binance" && i.providerSymbol === t.s
    );
    if (!instrument) return;

    const quote: Quote = {
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      bid: Number(t.b),
      ask: Number(t.a),
      last: Number(t.c),
      high24h: Number(t.h),
      low24h: Number(t.l),
      volume24h: Number(t.v),
      change24hPct: Number(t.P),
      isIndicative: false, // real exchange best-bid/ask from Binance
      source: "binance",
      sourceTs: new Date(t.E).toISOString(),
    };
    await upsertQuote(quote);
  }
}
