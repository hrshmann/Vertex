import { Router } from "express";
import { getInstrumentBySymbol, listInstruments } from "../services/marketData/instrumentCache";
import { getAllQuotes, getQuote } from "../services/marketData/quoteCache";
import { getCandles, UnsupportedCandleRequest } from "../services/marketData/candles";
import { asyncHandler } from "../utils/asyncHandler";
import { parseLimit } from "../utils/pagination";
import { ApiError } from "../middleware/errorHandler";

export function marketsRouter() {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const instruments = listInstruments();
      const quotes = new Map(getAllQuotes().map((q) => [q.symbol, q]));
      res.json(
        instruments.map((i) => ({
          symbol: i.symbol,
          class: i.class,
          isExecutable: i.isExecutable,
          tradingEnabled: i.tradingEnabled,
          provider: i.provider,
          contractSize: i.contractSize,
          minVolume: i.minVolume,
          maxVolume: i.maxVolume,
          volumeStep: i.volumeStep,
          maxLeverage: i.maxLeverage,
          quote: quotes.get(i.symbol) ?? null,
        }))
      );
    })
  );

  router.get(
    "/:symbol/quote",
    asyncHandler(async (req, res) => {
      const symbol = decodeURIComponent(req.params.symbol);
      const instrument = getInstrumentBySymbol(symbol);
      if (!instrument) throw new ApiError(404, `Unknown instrument: ${symbol}`);
      const quote = getQuote(symbol);
      if (!quote) throw new ApiError(503, `No quote received yet for ${symbol}`);
      res.json(quote);
    })
  );

  router.get(
    "/:symbol/candles",
    asyncHandler(async (req, res) => {
      const symbol = decodeURIComponent(req.params.symbol);
      const instrument = getInstrumentBySymbol(symbol);
      if (!instrument) throw new ApiError(404, `Unknown instrument: ${symbol}`);
      const timeframe = String(req.query.timeframe ?? "1H");
      const limit = parseLimit(req.query.limit, 300, 1000);
      try {
        const series = await getCandles(instrument, timeframe, limit);
        res.json({ symbol, timeframe, provider: series.source, isIndicative: series.isIndicative, candles: series.candles });
      } catch (err) {
        if (err instanceof UnsupportedCandleRequest) throw new ApiError(400, err.message);
        throw err;
      }
    })
  );

  return router;
}
