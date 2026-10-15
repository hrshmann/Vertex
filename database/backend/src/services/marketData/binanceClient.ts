import { env } from "../../config/env";
import { Instrument } from "../../types";
import { listInstruments } from "./instrumentCache";
import { upsertQuote } from "./quoteCache";
import { ReconnectingSocket } from "./reconnectingSocket";

export interface CryptoPrimaryFeed {
  hasFreshQuote(symbol: string): boolean;
  usdtUsdRate(): number | null;
}

/**
 * Fallback crypto feed: Binance's public 24hr-ticker WebSocket stream (no API key).
 * Source: https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams
 *
 * Binance quotes these markets in USDT, not USD (USDT trades slightly off $1), so prices are
 * converted with the primary feed's live USDT-USD rate. A quote is only published while the
 * primary feed (Coinbase, real USD books) has no current quote for that symbol, so the two
 * sources never alternate on a healthy connection.
 */
export class BinanceMarketDataClient {
  private socket: ReconnectingSocket | null = null;

  constructor(private readonly primary: CryptoPrimaryFeed) {}

  start() {
    const bySymbol = new Map<string, Instrument>();
    for (const instrument of listInstruments()) {
      if (instrument.provider === "binance") bySymbol.set(instrument.providerSymbol, instrument);
    }
    if (bySymbol.size === 0) {
      console.warn("[binance] no crypto instruments loaded — skipping connection");
      return;
    }
    const streams = [...bySymbol.keys()].map((s) => `${s.toLowerCase()}@ticker`).join("/");
    this.socket = new ReconnectingSocket("binance", `${env.binanceWsBase}/stream?streams=${streams}`, {
      onMessage: (message) => {
        const ticker = message.data;
        if (ticker?.e !== "24hrTicker") return;
        const instrument = bySymbol.get(ticker.s);
        if (instrument) return this.handleTicker(instrument, ticker);
      },
    });
    this.socket.start();
  }

  stop() {
    this.socket?.stop();
  }

  private async handleTicker(instrument: Instrument, t: any) {
    if (this.primary.hasFreshQuote(instrument.symbol)) return;

    // Without a known rate (primary feed never connected), USDT is used at par.
    const usd = this.primary.usdtUsdRate() ?? 1;
    await upsertQuote({
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      bid: Number(t.b) * usd,
      ask: Number(t.a) * usd,
      last: Number(t.c) * usd,
      high24h: Number(t.h) * usd,
      low24h: Number(t.l) * usd,
      volume24h: Number(t.v),
      change24hPct: Number(t.P),
      isIndicative: false,
      source: "binance",
      sourceTs: new Date(t.E).toISOString(),
    });
  }
}
