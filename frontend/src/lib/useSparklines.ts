"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";

export interface Sparkline {
  /** "1h": hourly closes over the last day. "1d": daily reference rates over the last month. */
  interval: "1h" | "1d";
  points: number[];
}
type Sparklines = Record<string, Sparkline>;

/** The server refreshes its lines every 5 minutes. */
const REFRESH_MS = 5 * 60_000;

let lines: Sparklines = {};
const EMPTY: Sparklines = lines;
const subscribers = new Set<() => void>();
let lastFetchAt = 0;
let fetching = false;

async function refresh() {
  if (fetching || Date.now() - lastFetchAt < REFRESH_MS) return;
  fetching = true;
  try {
    lines = await api.get<Sparklines>("/api/markets/sparklines");
    // Lines appear a few seconds after the server starts: retry soon while there are none.
    lastFetchAt = Object.keys(lines).length > 0 ? Date.now() : Date.now() - REFRESH_MS + 20_000;
    subscribers.forEach((notify) => notify());
  } catch {
    lastFetchAt = Date.now() - REFRESH_MS + 30_000;
  } finally {
    fetching = false;
  }
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  return () => subscribers.delete(notify);
}

/** Recent price history per symbol, for the small trend lines in market lists. */
export function useSparklines(): Sparklines {
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(timer);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => lines,
    () => EMPTY
  );
}
