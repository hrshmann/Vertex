import { BinanceMarketDataClient } from "./binanceClient";
import { CoinbaseMarketDataClient } from "./coinbaseClient";
import { ForexIndicativeClient } from "./forexClient";
import { KrakenForexClient } from "./krakenForexClient";

/**
 * Market-data feeds, each primary paired with a fallback that only publishes a symbol while
 * the primary has no current quote for it:
 *   crypto: Coinbase (real USD books)  -> Binance (USDT books, converted to USD)
 *   forex:  Kraken (live fiat markets) -> Frankfurter (ECB daily reference rates)
 */
export const coinbaseFeed = new CoinbaseMarketDataClient();
export const binanceFeed = new BinanceMarketDataClient(coinbaseFeed);
export const krakenFeed = new KrakenForexClient();
export const ecbFeed = new ForexIndicativeClient(krakenFeed);
