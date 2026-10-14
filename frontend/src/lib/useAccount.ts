"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { Account } from "./types";
import { useMarketSocket } from "./useMarketSocket";

export function useAccount(mode: "DEMO" | "LIVE" = "DEMO") {
  const [account, setAccount] = useState<Account | null>(null);

  const load = useCallback(() => {
    api.get<Account>(`/api/account?mode=${mode}`).then(setAccount).catch(() => {});
  }, [mode]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // periodic resync as a safety net alongside WS pushes
    return () => clearInterval(interval);
  }, [load]);

  // Refresh on account-affecting events; the 5s poll above keeps equity reasonably fresh
  // between ticks without refetching on every single market.tick (several per second).
  useMarketSocket((evt) => {
    if (
      evt.event === "balance.updated" ||
      evt.event === "order.filled" ||
      evt.event === "position.closed" ||
      evt.event === "position.opened"
    ) {
      load();
    }
  });

  return { account, reload: load };
}
