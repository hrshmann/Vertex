"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { MarketRow, Quote } from "./types";
import { isMarketSocketOpen, subscribeMarketSocket } from "./useMarketSocket";
import { MARKET_POLL_INTERVAL_MS } from "./config";

// Without a socket (e.g. host has no WebSocket proxying), poll fast enough to look live while
// staying well inside the API rate limit (120 requests/min per IP).
const FALLBACK_POLL_INTERVAL_MS = Math.min(3_000, MARKET_POLL_INTERVAL_MS);
/** Ticks are applied in batches: a hundred markets can tick many times a second between them. */
const TICK_FLUSH_MS = 250;

interface MarketsState {
  rows: MarketRow[];
  loading: boolean;
  error: string | null;
}

/**
 * One market feed per tab, shared by every component that shows prices (ticker tape, list,
 * heatmap...), so a page makes one set of requests however many of them it renders. It runs
 * while at least one component uses it and keeps the last prices between pages.
 */
let state: MarketsState = { rows: [], loading: true, error: null };
const SERVER_STATE: MarketsState = state;
const subscribers = new Set<() => void>();
let users = 0;
let stopFeed: (() => void) | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
/** Moving between pages unmounts one price view just before mounting the next: keep the feed. */
const STOP_DELAY_MS = 5_000;

function setState(patch: Partial<MarketsState>) {
  state = { ...state, ...patch };
  subscribers.forEach((notify) => notify());
}

function startFeed(): () => void {
  let active = true;
  let fetching = false;
  let lastLoadAt = 0;
  const pending = new Map<string, Quote>();

  const load = async () => {
    if (fetching) return;
    fetching = true;
    try {
      const rows = await api.get<MarketRow[]>("/api/markets");
      if (active) setState({ rows, error: null, loading: false });
    } catch (err) {
      if (active) setState({ error: err instanceof Error ? err.message : "Market data is unavailable", loading: false });
    } finally {
      fetching = false;
    }
  };

  // Live ticks arrive over the socket; polling is a slow resync while it is connected and
  // the only price source (at FALLBACK_POLL_INTERVAL_MS) while it is not.
  const tick = () => {
    const due = isMarketSocketOpen() ? MARKET_POLL_INTERVAL_MS : FALLBACK_POLL_INTERVAL_MS;
    if (Date.now() - lastLoadAt < due) return;
    lastLoadAt = Date.now();
    void load();
  };
  tick();
  const poll = setInterval(tick, 1_000);

  const flush = setInterval(() => {
    if (pending.size === 0 || state.rows.length === 0) return;
    const rows = state.rows.map((row) => {
      const quote = pending.get(row.symbol);
      return quote ? { ...row, quote } : row;
    });
    pending.clear();
    setState({ rows });
  }, TICK_FLUSH_MS);

  const unsubscribe = subscribeMarketSocket((evt) => {
    if (evt.event === "market.tick") {
      const quote = evt.data as Quote;
      pending.set(quote.symbol, quote);
    }
  });

  return () => {
    active = false;
    clearInterval(poll);
    clearInterval(flush);
    unsubscribe();
  };
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => subscribers.delete(notify);
}

/** Every market with its latest quote, kept fresh through WebSockets with REST as fallback. */
export function useMarkets(): MarketsState {
  useEffect(() => {
    users += 1;
    if (stopTimer) clearTimeout(stopTimer);
    stopTimer = null;
    if (!stopFeed) stopFeed = startFeed();
    return () => {
      users -= 1;
      if (users > 0) return;
      stopTimer = setTimeout(() => {
        stopFeed?.();
        stopFeed = null;
      }, STOP_DELAY_MS);
    };
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE
  );
}
