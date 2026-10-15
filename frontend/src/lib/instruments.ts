/** Plain-language names for the listed instruments; unknown symbols fall back to the symbol. */
const NAMES: Record<string, string> = {
  "BTC/USD": "Bitcoin",
  "ETH/USD": "Ethereum",
  "SOL/USD": "Solana",
  "XRP/USD": "XRP",
  "LTC/USD": "Litecoin",
  "EUR/USD": "Euro / US dollar",
  "GBP/USD": "British pound / US dollar",
  "AUD/USD": "Australian dollar / US dollar",
  "NZD/USD": "New Zealand dollar / US dollar",
  "USD/CAD": "US dollar / Canadian dollar",
  "USD/CHF": "US dollar / Swiss franc",
  "USD/JPY": "US dollar / Japanese yen",
};

export const instrumentName = (symbol: string) => NAMES[symbol] ?? symbol;

const SOURCES: Record<string, string> = {
  coinbase: "Coinbase",
  binance: "Binance",
  kraken: "Kraken",
  frankfurter: "European Central Bank, daily rate",
};

export const sourceName = (source: string | null | undefined) => (source ? SOURCES[source] ?? source : "");
