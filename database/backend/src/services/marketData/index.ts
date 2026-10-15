import { loadInstrumentCache } from "./instrumentCache";
import { BinanceMarketDataClient } from "./binanceClient";
import { ForexIndicativeClient } from "./forexClient";
import { onQuoteUpdate } from "./quoteCache";
import { WsHub } from "../ws/wsHub";
import { DemoTradingEngine } from "../trading/demoEngine";

// Minimum gap between engine runs per symbol. onQuoteTick reads the latest cached quote, so
// skipped ticks are not lost; this only bounds DB load and prevents overlapping runs.
const ENGINE_TICK_INTERVAL_MS = 2_000;

/** Boots instrument cache + both market-data feeds, and wires ticks into the WS hub and demo engine. */
export async function startMarketData(hub: WsHub, engine: DemoTradingEngine) {
  await loadInstrumentCache();

  const engineRuns = new Map<string, { running: boolean; lastRunAt: number }>();
  onQuoteUpdate((quote) => {
    hub.broadcastMarket("market.tick", quote);

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

  const binance = new BinanceMarketDataClient();
  binance.start();

  const forex = new ForexIndicativeClient();
  forex.start();

  return { binance, forex };
}
