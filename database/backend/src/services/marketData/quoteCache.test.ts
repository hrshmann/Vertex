import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("../../db/pool", () => ({ pool: { query: mocks.query } }));
vi.mock("./instrumentCache", () => ({
  getInstrumentBySymbol: () => ({ id: "instrument-btc", symbol: "BTC/USD" }),
}));

import { getQuote, onQuoteUpdate, upsertQuote } from "./quoteCache";
import type { Quote } from "../../types";

const quote = (bid: number): Quote => ({
  instrumentId: "instrument-btc",
  symbol: "BTC/USD",
  bid,
  ask: bid + 1,
  last: bid,
  high24h: null,
  low24h: null,
  volume24h: null,
  change24hPct: null,
  isIndicative: false,
  source: "binance",
  sourceTs: new Date().toISOString(),
});

describe("quote cache", () => {
  afterEach(() => vi.useRealTimers());

  it("updates memory and listeners on every tick but persists at most every 30s", async () => {
    vi.useFakeTimers();
    mocks.query.mockResolvedValue({ rows: [], rowCount: 1, insertId: 0 });
    const listener = vi.fn();
    onQuoteUpdate(listener);

    await upsertQuote(quote(100));
    await upsertQuote(quote(101));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getQuote("BTC/USD")?.bid).toBe(101);
    expect(mocks.query).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    await upsertQuote(quote(102));
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });
});
