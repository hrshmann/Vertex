"use client";

import { useState } from "react";
import clsx from "clsx";
import { api, ApiRequestError } from "@/lib/api";
import { usePositions } from "@/lib/usePositions";
import { useOrders } from "@/lib/useOrders";
import { PriceFlash } from "@/components/PriceFlash";
import { priceDecimals } from "@/lib/format";

const TABS = ["Positions", "Orders", "History"] as const;

export function BottomPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Positions");
  const { positions, reload: reloadPositions } = usePositions();
  const { orders, reload: reloadOrders } = useOrders();

  const openOrders = orders.filter((o) => o.status === "OPEN" || o.status === "PENDING");
  const history = orders.filter((o) => o.status !== "OPEN" && o.status !== "PENDING");

  async function closePosition(id: string) {
    try {
      await api.post(`/api/positions/${id}/close`);
      reloadPositions();
    } catch {
      /* surfaced via reload failing to remove the row; acceptable for MVP */
    }
  }

  async function cancelOrder(id: string) {
    try {
      await api.delete(`/api/orders/${id}`);
      reloadOrders();
    } catch {
      /* no-op */
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 px-3 pt-2 border-b border-[rgb(var(--border))]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "px-3 py-2 text-xs font-medium rounded-t-md transition-colors",
              tab === t ? "bg-vx-accent/10 text-vx-accent" : "vx-muted hover:text-[rgb(var(--text))]"
            )}
          >
            {t} {t === "Positions" && positions.length > 0 && `(${positions.length})`}
            {t === "Orders" && openOrders.length > 0 && `(${openOrders.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {tab === "Positions" && (
          <table className="w-full text-xs">
            <thead className="vx-surface-2 vx-muted uppercase tracking-wide sticky top-0">
              <tr>
                <Th>Symbol</Th>
                <Th>Side</Th>
                <Th align="right">Volume</Th>
                <Th align="right">Entry</Th>
                <Th align="right">Current</Th>
                <Th align="right">SL</Th>
                <Th align="right">TP</Th>
                <Th align="right">P/L</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {positions.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-6 vx-muted">No open positions</td>
                </tr>
              )}
              {positions.map((p) => (
                <tr key={p.id}>
                  <Td className="font-medium vx-tabular">{p.symbol}</Td>
                  <Td className={p.side === "BUY" ? "text-vx-buy" : "text-vx-sell"}>{p.side}</Td>
                  <Td align="right" className="vx-tabular">{p.volume}</Td>
                  <Td align="right" className="vx-tabular">{p.entryPrice.toFixed(priceDecimals(p.symbol, p.entryPrice))}</Td>
                  <Td align="right"><PriceFlash value={p.currentPrice} decimals={priceDecimals(p.symbol, p.entryPrice)} /></Td>
                  <Td align="right" className="vx-tabular vx-muted">{p.stopLoss ?? "—"}</Td>
                  <Td align="right" className="vx-tabular vx-muted">{p.takeProfit ?? "—"}</Td>
                  <Td align="right" className={clsx("vx-tabular font-medium", (p.unrealizedPnl ?? 0) >= 0 ? "text-vx-buy" : "text-vx-sell")}>
                    {p.unrealizedPnl != null ? `${p.unrealizedPnl >= 0 ? "+" : ""}${p.unrealizedPnl.toFixed(2)}` : "—"}
                  </Td>
                  <Td align="right">
                    <button onClick={() => closePosition(p.id)} className="text-vx-accent hover:underline">
                      Close
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Orders" && (
          <table className="w-full text-xs">
            <thead className="vx-surface-2 vx-muted uppercase tracking-wide sticky top-0">
              <tr>
                <Th>Symbol</Th>
                <Th>Side</Th>
                <Th>Type</Th>
                <Th align="right">Volume</Th>
                <Th align="right">Price</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {openOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 vx-muted">No open orders</td>
                </tr>
              )}
              {openOrders.map((o) => (
                <tr key={o.id}>
                  <Td className="font-medium vx-tabular">{o.symbol}</Td>
                  <Td className={o.side === "BUY" ? "text-vx-buy" : "text-vx-sell"}>{o.side}</Td>
                  <Td>{o.type}</Td>
                  <Td align="right" className="vx-tabular">{o.volume}</Td>
                  <Td align="right" className="vx-tabular">{o.limit_price ?? o.stop_price ?? "Market"}</Td>
                  <Td>{o.status}</Td>
                  <Td align="right">
                    <button onClick={() => cancelOrder(o.id)} className="text-vx-sell hover:underline">
                      Cancel
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "History" && (
          <table className="w-full text-xs">
            <thead className="vx-surface-2 vx-muted uppercase tracking-wide sticky top-0">
              <tr>
                <Th>Symbol</Th>
                <Th>Side</Th>
                <Th>Type</Th>
                <Th align="right">Volume</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 vx-muted">No order history yet</td>
                </tr>
              )}
              {history.map((o) => (
                <tr key={o.id}>
                  <Td className="font-medium vx-tabular">{o.symbol}</Td>
                  <Td className={o.side === "BUY" ? "text-vx-buy" : "text-vx-sell"}>{o.side}</Td>
                  <Td>{o.type}</Td>
                  <Td align="right" className="vx-tabular">{o.volume}</Td>
                  <Td>{o.status}</Td>
                  <Td className="vx-muted">{new Date(o.created_at).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return <th className={clsx("px-3 py-2 font-medium", align === "right" ? "text-right" : "text-left")}>{children}</th>;
}
function Td({ children, align = "left", className }: { children?: React.ReactNode; align?: "left" | "right"; className?: string }) {
  return <td className={clsx("px-3 py-2", align === "right" ? "text-right" : "text-left", className)}>{children}</td>;
}
