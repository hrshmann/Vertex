"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { MarketRow, Quote } from "./types";
import { isMarketSocketOpen, useMarketSocket } from "./useMarketSocket";
import { MARKET_POLL_INTERVAL_MS } from "./config";

// Without a socket (e.g. host has no WebSocket proxying), poll fast enough to look live while
// staying well inside the API rate limit (120 requests/min per IP).
const FALLBACK_POLL_INTERVAL_MS = Math.min(3_000, MARKET_POLL_INTERVAL_MS);

/** Keeps quotes fresh through WebSockets when available and REST polling as a fallback. */
export function useMarkets() {
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let fetching = false;
    const loadMarkets = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const result = await api.get<MarketRow[]>("/api/markets");
        if (!active) return;
        setRows(result);
        setError(null);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Market data is unavailable");
        }
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    };
    // Live ticks arrive over the socket; polling is a slow resync while it is connected and
    // the only price source (at FALLBACK_POLL_INTERVAL_MS) while it is not.
    let lastLoadAt = 0;
    const tick = () => {
      const due = isMarketSocketOpen() ? MARKET_POLL_INTERVAL_MS : FALLBACK_POLL_INTERVAL_MS;
      if (Date.now() - lastLoadAt < due) return;
      lastLoadAt = Date.now();
      void loadMarkets();
    };
    tick();
    const interval = setInterval(tick, 1_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useMarketSocket((evt) => {
    if (evt.event !== "market.tick") return;
    const quote = evt.data as Quote;
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.symbol === quote.symbol);
      if (idx === -1) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], quote };
      return next;
    });
  });

  return { rows, loading, error };
}
