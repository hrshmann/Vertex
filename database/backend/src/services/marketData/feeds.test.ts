import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upsertQuote: vi.fn() }));

vi.mock("./quoteCache", () => ({ upsertQuote: mocks.upsertQuote }));
vi.mock("./instrumentCache", () => ({ listInstruments: () => [] }));

import { BinanceMarketDataClient } from "./binanceClient";
import { KrakenForexClient } from "./krakenForexClient";
import type { Instrument } from "../../types";

const btc = { id: "btc", symbol: "BTC/USD", class: "CRYPTO", baseAsset: "BTC" } as Instrument;
const eurusd = { id: "eurusd", symbol: "EUR/USD", class: "FOREX" } as Instrument;

const binanceTicker = { b: "100000", a: "100001", c: "100000.5", h: "101000", l: "99000", v: "12", P: "1.5", E: Date.now() };

describe("Binance fallback feed", () => {
  beforeEach(() => mocks.upsertQuote.mockReset());

  it("stays silent while the primary feed has a current quote", async () => {
    const client = new BinanceMarketDataClient({ hasFreshQuote: () => true, usdtUsdRate: () => 0.999 });
    await (client as any).handleTicker(btc, binanceTicker);
    expect(mocks.upsertQuote).not.toHaveBeenCalled();
  });

  it("publishes USDT prices converted to USD when the primary feed is quiet", async () => {
    const client = new BinanceMarketDataClient({ hasFreshQuote: () => false, usdtUsdRate: () => 0.999 });
    await (client as any).handleTicker(btc, binanceTicker);
    const quote = mocks.upsertQuote.mock.calls[0][0];
    expect(quote.source).toBe("binance");
    expect(quote.bid).toBeCloseTo(99_900, 6);
    expect(quote.ask).toBeCloseTo(100_001 * 0.999, 6);
    expect(quote.volume24h).toBe(12); // base-asset volume is not a price
  });
});

describe("Kraken forex feed", () => {
  beforeEach(() => mocks.upsertQuote.mockReset());

  it("publishes liquid quotes", async () => {
    const client = new KrakenForexClient();
    await (client as any).handleTicker(eurusd, { bid: 1.1214, ask: 1.12141, last: 1.1214, change_pct: 0.2 });
    expect(mocks.upsertQuote).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "EUR/USD", bid: 1.1214, ask: 1.12141, source: "kraken", isIndicative: true })
    );
  });

  it("rejects quotes from an illiquid book", async () => {
    const client = new KrakenForexClient();
    // Spread observed on Kraken's thin USD/JPY market: ~190 bps.
    await (client as any).handleTicker(eurusd, { bid: 157.381, ask: 160.4, last: 157.381 });
    await (client as any).handleTicker(eurusd, { bid: 0, ask: 1.1 });
    expect(mocks.upsertQuote).not.toHaveBeenCalled();
  });
});
