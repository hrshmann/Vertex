"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { Position } from "./types";
import { useMarketSocket } from "./useMarketSocket";

export function usePositions(mode: "DEMO" | "LIVE" = "DEMO") {
  const [positions, setPositions] = useState<Position[]>([]);

  const load = useCallback(() => {
    api.get<Position[]>(`/api/positions?mode=${mode}`).then(setPositions).catch(() => {});
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  useMarketSocket((evt) => {
    if (evt.event === "position.opened" || evt.event === "position.closed") load();
    if (evt.event === "market.tick") {
      // Cheap client-side refresh of current price / unrealized P/L without a network round trip.
      const quote = evt.data as { symbol: string; bid: number; ask: number };
      setPositions((prev) =>
        prev.map((p) => {
          if (p.symbol !== quote.symbol) return p;
          const currentPrice = p.side === "BUY" ? quote.bid : quote.ask;
          const direction = p.side === "BUY" ? 1 : -1;
          const unrealizedPnl = direction * (currentPrice - p.entryPrice) * p.volume;
          return { ...p, currentPrice, unrealizedPnl };
        })
      );
    }
  });

  return { positions, reload: load };
}
