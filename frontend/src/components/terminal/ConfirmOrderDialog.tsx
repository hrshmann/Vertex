"use client";

import { OrderSide, OrderType } from "@/lib/types";

export interface PendingOrder {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  volume: number;
  entryLabel: string;
  stopLoss?: number;
  takeProfit?: number;
  estimatedMargin: number;
  estimatedSpread: number;
  estimatedFees: number;
  priceDecimals: number;
}

export function ConfirmOrderDialog({
  order,
  onCancel,
  onConfirm,
  submitting,
}: {
  order: PendingOrder;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="vx-surface rounded-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Confirm Order</h3>

        <div className="vx-surface-2 rounded-xl p-4 space-y-2.5 text-sm mb-5">
          <Row label="Instrument" value={order.symbol} />
          <Row
            label="Side"
            value={order.side}
            valueClass={order.side === "BUY" ? "text-vx-buy" : "text-vx-sell"}
          />
          <Row label="Volume" value={String(order.volume)} />
          <Row label="Entry" value={order.entryLabel} />
          {order.stopLoss != null && <Row label="Stop Loss" value={order.stopLoss.toFixed(order.priceDecimals)} />}
          {order.takeProfit != null && <Row label="Take Profit" value={order.takeProfit.toFixed(order.priceDecimals)} />}
          <div className="h-px bg-[rgb(var(--border))] my-2" />
          <Row label="Est. spread" value={order.estimatedSpread.toFixed(order.priceDecimals)} muted />
          <Row label="Est. required margin" value={`$${order.estimatedMargin.toFixed(2)}`} muted />
          <Row label="Est. fees" value={`$${order.estimatedFees.toFixed(2)}`} muted />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-lg vx-surface-2 px-4 py-2.5 text-sm font-medium hover:bg-[rgb(var(--border))] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 ${
              order.side === "BUY" ? "bg-vx-buy hover:bg-vx-buy/90" : "bg-vx-sell hover:bg-vx-sell/90"
            }`}
          >
            {submitting ? "Placing…" : "Confirm Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, valueClass }: { label: string; value: string; muted?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="vx-muted">{label}</span>
      <span className={`vx-tabular font-medium ${muted ? "vx-muted font-normal" : ""} ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  );
}
