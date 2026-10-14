"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { OrderRow } from "./types";
import { useMarketSocket } from "./useMarketSocket";

export function useOrders(mode: "DEMO" | "LIVE" = "DEMO") {
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const load = useCallback(() => {
    api.get<OrderRow[]>(`/api/orders?mode=${mode}`).then(setOrders).catch(() => {});
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  useMarketSocket((evt) => {
    if (["order.created", "order.filled", "order.cancelled"].includes(evt.event)) load();
  });

  return { orders, reload: load };
}
