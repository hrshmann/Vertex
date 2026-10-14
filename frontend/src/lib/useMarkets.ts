"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { MarketRow, Quote } from "./types";
import { useMarketSocket } from "./useMarketSocket";
import { MARKET_POLL_INTERVAL_MS } from "./config";

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
    void loadMarkets();
    const interval = setInterval(() => void loadMarkets(), MARKET_POLL_INTERVAL_MS);
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
