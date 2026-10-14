import { pool } from "../../db/pool";
import { Quote } from "../../types";
import { getInstrumentBySymbol } from "./instrumentCache";

const quotes = new Map<string, Quote>(); // keyed by symbol

export type QuoteListener = (quote: Quote) => void;
const listeners = new Set<QuoteListener>();

export function onQuoteUpdate(listener: QuoteListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function upsertQuote(q: Quote): Promise<void> {
  quotes.set(q.symbol, q);
  for (const listener of listeners) listener(q);

  const instrument = getInstrumentBySymbol(q.symbol);
  if (!instrument) return;

  await pool.query(
    `INSERT INTO market_quotes (instrument_id, bid, ask, last, high_24h, low_24h, volume_24h, change_24h_pct, is_indicative, source_ts, received_at)
     VALUES (?,?,?,?,?,?,?,?,?,?, now())
     ON DUPLICATE KEY UPDATE
       bid = VALUES(bid), ask = VALUES(ask), last = VALUES(last),
       high_24h = VALUES(high_24h), low_24h = VALUES(low_24h),
       volume_24h = VALUES(volume_24h), change_24h_pct = VALUES(change_24h_pct),
       is_indicative = VALUES(is_indicative), source_ts = VALUES(source_ts), received_at = now()`,
    [
      instrument.id,
      q.bid,
      q.ask,
      q.last,
      q.high24h,
      q.low24h,
      q.volume24h,
      q.change24hPct,
      q.isIndicative,
      new Date(q.sourceTs),
    ]
  );
}

export function getQuote(symbol: string): Quote | undefined {
  return quotes.get(symbol);
}

export function getAllQuotes(): Quote[] {
  return Array.from(quotes.values());
}
