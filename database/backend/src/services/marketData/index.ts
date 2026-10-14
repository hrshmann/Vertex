import { loadInstrumentCache } from "./instrumentCache";
import { BinanceMarketDataClient } from "./binanceClient";
import { ForexIndicativeClient } from "./forexClient";
import { onQuoteUpdate } from "./quoteCache";
import { WsHub } from "../ws/wsHub";
import { DemoTradingEngine } from "../trading/demoEngine";

/** Boots instrument cache + both market-data feeds, and wires ticks into the WS hub and demo engine. */
export async function startMarketData(hub: WsHub, engine: DemoTradingEngine) {
  await loadInstrumentCache();

  onQuoteUpdate((quote) => {
    hub.broadcastMarket("market.tick", quote);
    engine.onQuoteTick(quote.symbol).catch((err) => {
      console.error(`[engine] onQuoteTick(${quote.symbol}) failed`, err);
    });
  });

  const binance = new BinanceMarketDataClient();
  binance.start();

  const forex = new ForexIndicativeClient();
  forex.start();

  return { binance, forex };
}
