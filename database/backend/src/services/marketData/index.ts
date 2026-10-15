import { loadInstrumentCache } from "./instrumentCache";
import { binanceFeed, coinbaseFeed, ecbFeed, krakenFeed } from "./feeds";
import { onQuoteUpdate } from "./quoteCache";
import { createTickThrottle } from "./tickThrottle";
import { Quote } from "../../types";
import { WsHub } from "../ws/wsHub";
import { DemoTradingEngine } from "../trading/demoEngine";

// At most this many ms between price updates sent to browsers per symbol (2/s); the latest
// price is always delivered.
const BROADCAST_INTERVAL_MS = 500;

// Minimum gap between engine runs per symbol. onQuoteTick reads the latest cached quote, so
// skipped ticks are not lost; this only bounds DB load and prevents overlapping runs.
const ENGINE_TICK_INTERVAL_MS = 2_000;

/** Boots instrument cache + all market-data feeds, and wires ticks into the WS hub and demo engine. */
export async function startMarketData(hub: WsHub, engine: DemoTradingEngine) {
  await loadInstrumentCache();

  const broadcast = createTickThrottle<Quote>((_symbol, quote) => hub.broadcastMarket("market.tick", quote), BROADCAST_INTERVAL_MS);
  const engineRuns = new Map<string, { running: boolean; lastRunAt: number }>();
  onQuoteUpdate((quote) => {
    broadcast.push(quote.symbol, quote);

    let run = engineRuns.get(quote.symbol);
    if (!run) {
      run = { running: false, lastRunAt: 0 };
      engineRuns.set(quote.symbol, run);
    }
    if (run.running || Date.now() - run.lastRunAt < ENGINE_TICK_INTERVAL_MS) return;
    run.running = true;
    run.lastRunAt = Date.now();
    const current = run;
    engine
      .onQuoteTick(quote.symbol)
      .catch((err) => {
        console.error(`[engine] onQuoteTick(${quote.symbol}) failed`, err);
      })
      .finally(() => {
        current.running = false;
      });
  });

  const feeds = [coinbaseFeed, binanceFeed, krakenFeed, ecbFeed];
  for (const feed of feeds) feed.start();

  return {
    stop() {
      for (const feed of feeds) feed.stop();
      broadcast.stop();
    },
  };
}
