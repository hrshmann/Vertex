import { pool } from "../../db/pool";
import { Quote } from "../../types";
import { getInstrumentBySymbol } from "./instrumentCache";

const quotes = new Map<string, Quote>(); // keyed by symbol

// Live quotes are served from memory; market_quotes is only a persisted snapshot. Writing it on
// every tick (~1/s per crypto symbol) wastes the shared-hosting database's query budget.
const PERSIST_INTERVAL_MS = 30_000;
const lastPersistedAt = new Map<string, number>();

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

  const now = Date.now();
  if (now - (lastPersistedAt.get(q.symbol) ?? 0) < PERSIST_INTERVAL_MS) return;
  lastPersistedAt.set(q.symbol, now);

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
