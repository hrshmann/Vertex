"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "vx-watchlist";
const DEFAULT_WATCHLIST = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "EUR/USD", "GBP/USD", "USD/JPY"];

/**
 * The visitor's starred markets, kept in this browser only. Storage can be unavailable
 * (private windows, blocked site data); the list then lasts for the visit.
 */
let watchlist: string[] = DEFAULT_WATCHLIST;
let loaded = false;
const subscribers = new Set<() => void>();

function read(): string[] {
  if (!loaded) {
    loaded = true;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (Array.isArray(saved) && saved.every((s) => typeof s === "string")) watchlist = saved;
    } catch {
      /* keep the default */
    }
  }
  return watchlist;
}

function write(next: string[]) {
  watchlist = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* not persisted */
  }
  subscribers.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => subscribers.delete(notify);
}

export function useWatchlist() {
  const list = useSyncExternalStore(subscribe, read, () => DEFAULT_WATCHLIST);
  const toggle = useCallback((symbol: string) => {
    const current = read();
    write(current.includes(symbol) ? current.filter((s) => s !== symbol) : [...current, symbol]);
  }, []);
  return { watchlist: list, isWatched: (symbol: string) => list.includes(symbol), toggle };
}
