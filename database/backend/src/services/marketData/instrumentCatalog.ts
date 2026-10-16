import { InstrumentClass } from "../../types";

/**
 * Every listed market, in display order (largest first). Missing rows are added to the
 * instruments table at startup (see instrumentCache.ts), so listing a market is a code change
 * and a deploy, with no manual migration. Rows are never removed or changed from here.
 *
 * Crypto: each coin is quoted live as BASE-USD on Coinbase, with Binance BASEUSDT as fallback
 * and chart history; only coins listed on both are included.
 * Forex: Kraken streams the pairs it quotes liquidly (EUR/USD, GBP/USD, USD/CAD, USD/CHF,
 * AUD/USD, EUR/GBP, EUR/CHF, EUR/CAD, EUR/AUD at last check); every other pair, and any pair
 * while Kraken is down, uses the ECB daily reference rate. Both currencies must be ones the ECB
 * publishes (see forexClient.ts).
 */
const CRYPTO = [
  "BTC", "ETH", "XRP", "BNB", "SOL", "DOGE", "ADA", "HYPE", "LINK", "BCH",
  "XLM", "AVAX", "SUI", "HBAR", "LTC", "TON", "SHIB", "DOT", "ZEC", "UNI",
  "NEAR", "AAVE", "PEPE", "ICP", "APT", "ETC", "ENA", "ONDO", "POL", "TAO",
  "ATOM", "WLD", "ARB", "FIL", "ALGO", "RENDER", "VET", "QNT", "SKY", "FET",
  "TRUMP", "OP", "INJ", "SEI", "STX", "BONK", "TIA", "PENGU", "IMX", "LDO",
  "GRT", "CRV", "FLOKI", "PYTH", "WIF", "JTO", "PENDLE", "STRK", "ZRO",
  "ETHFI", "EIGEN", "ZK", "DASH", "XTZ", "SAND", "MANA", "AXS", "CHZ", "COMP",
  "SNX", "APE",
];

const FOREX = [
  // Majors
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD",
  // Crosses
  "EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/AUD", "EUR/CAD", "EUR/NZD",
  "GBP/JPY", "GBP/CHF", "GBP/AUD", "GBP/CAD", "AUD/JPY", "AUD/NZD", "AUD/CAD",
  "CAD/JPY", "CHF/JPY", "NZD/JPY",
  // Scandinavian, European and emerging-market currencies
  "USD/SEK", "USD/NOK", "USD/DKK", "USD/PLN", "USD/HUF", "USD/CZK", "USD/TRY",
  "EUR/SEK", "EUR/NOK", "EUR/PLN", "EUR/TRY",
  "USD/ZAR", "USD/MXN", "USD/BRL", "USD/SGD", "USD/HKD", "USD/CNY", "USD/INR",
  "USD/THB", "USD/KRW", "USD/ILS",
];

export interface CatalogEntry {
  symbol: string;
  class: InstrumentClass;
  baseAsset: string;
  quoteAsset: string;
  provider: string;
  providerSymbol: string;
}

export const INSTRUMENT_CATALOG: CatalogEntry[] = [
  ...CRYPTO.map((base) => ({
    symbol: `${base}/USD`,
    class: "CRYPTO" as const,
    baseAsset: base,
    quoteAsset: "USDT",
    provider: "binance",
    providerSymbol: `${base}USDT`,
  })),
  ...FOREX.map((symbol) => {
    const [base, quote] = symbol.split("/");
    return {
      symbol,
      class: "FOREX" as const,
      baseAsset: base,
      quoteAsset: quote,
      provider: "frankfurter",
      providerSymbol: `${base}_${quote}`,
    };
  }),
];

const RANK = new Map(INSTRUMENT_CATALOG.map((entry, index) => [entry.symbol, index]));

/** Display position of a symbol; symbols not in the catalog sort last. */
export function catalogRank(symbol: string): number {
  return RANK.get(symbol) ?? Number.MAX_SAFE_INTEGER;
}
