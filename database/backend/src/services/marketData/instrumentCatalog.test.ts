import { describe, expect, it } from "vitest";
import { catalogRank, INSTRUMENT_CATALOG } from "./instrumentCatalog";
import { crossRate } from "./forexClient";

// Currencies the ECB publishes reference rates for (Frankfurter's list), plus USD itself.
const ECB = "USD AUD BRL CAD CHF CNY CZK DKK EUR GBP HKD HUF IDR ILS INR ISK JPY KRW MXN MYR NOK NZD PHP PLN RON SEK SGD THB TRY ZAR".split(" ");

describe("instrument catalog", () => {
  it("lists each symbol once", () => {
    const symbols = INSTRUMENT_CATALOG.map((e) => e.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it("only lists forex pairs the ECB fallback can price", () => {
    for (const entry of INSTRUMENT_CATALOG.filter((e) => e.class === "FOREX")) {
      expect(ECB).toContain(entry.baseAsset);
      expect(ECB).toContain(entry.quoteAsset);
    }
  });

  it("orders unknown symbols last", () => {
    expect(catalogRank("BTC/USD")).toBe(0);
    expect(catalogRank("NOPE/USD")).toBeGreaterThan(INSTRUMENT_CATALOG.length);
  });
});

describe("crossRate", () => {
  const usdRates = { EUR: 0.9, GBP: 0.75, JPY: 150 };

  it("derives USD pairs in market convention", () => {
    expect(crossRate("USD/JPY", usdRates)).toBeCloseTo(150, 10);
    expect(crossRate("EUR/USD", usdRates)).toBeCloseTo(1 / 0.9, 10);
  });

  it("derives crosses through USD", () => {
    expect(crossRate("GBP/JPY", usdRates)).toBeCloseTo(200, 10);
    expect(crossRate("EUR/GBP", usdRates)).toBeCloseTo(0.75 / 0.9, 10);
  });

  it("returns null for currencies without a rate", () => {
    expect(crossRate("USD/XYZ", usdRates)).toBeNull();
  });
});
