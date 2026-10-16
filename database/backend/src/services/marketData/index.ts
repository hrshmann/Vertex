import { loadInstrumentCache } from "./instrumentCache";
import { binanceFeed, coinbaseFeed, ecbFeed, krakenFeed } from "./feeds";
import { onQuoteUpdate } from "./quoteCache";
import { startSparklines } from "./sparklines";
import { createTickThrottle } from "./tickThrottle";
import { Quote } from "../../types";
import { WsHub } from "../ws/wsHub";

// At most this many ms between price updates sent to browsers per symbol (2/s); the latest
// price is always delivered.
const BROADCAST_INTERVAL_MS = 500;

/** Boots the instrument cache and all market-data feeds, and streams ticks to browsers. */
export async function startMarketData(hub: WsHub) {
  await loadInstrumentCache();

  const broadcast = createTickThrottle<Quote>((_symbol, quote) => hub.broadcastMarket("market.tick", quote), BROADCAST_INTERVAL_MS);
  onQuoteUpdate((quote) => broadcast.push(quote.symbol, quote));

  const feeds = [coinbaseFeed, binanceFeed, krakenFeed, ecbFeed];
  for (const feed of feeds) feed.start();
  const sparklines = startSparklines();

  return {
    stop() {
      for (const feed of feeds) feed.stop();
      sparklines.stop();
      broadcast.stop();
    },
  };
}
