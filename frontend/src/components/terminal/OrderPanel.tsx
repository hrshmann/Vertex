"use client";

import { useState } from "react";
import clsx from "clsx";
import { api, ApiRequestError } from "@/lib/api";
import { Account, MarketRow, OrderSide, OrderType } from "@/lib/types";
import { ConfirmOrderDialog, PendingOrder } from "./ConfirmOrderDialog";
import { formatMoney, priceDecimals } from "@/lib/format";

const ORDER_TYPES: OrderType[] = ["MARKET", "LIMIT", "STOP", "STOP_LIMIT"];
const ORDER_TYPE_LABELS: Record<OrderType, string> = { MARKET: "Market", LIMIT: "Limit", STOP: "Stop", STOP_LIMIT: "Stop limit" };

export function OrderPanel({
  instrument,
  account,
  onOrderPlaced,
}: {
  instrument: MarketRow | undefined;
  account: Account | null;
  onOrderPlaced: () => void;
}) {
  const [side, setSide] = useState<OrderSide>("BUY");
  const [type, setType] = useState<OrderType>("MARKET");
  const [volume, setVolume] = useState("0.01");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [pending, setPending] = useState<PendingOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!instrument) {
    return <div className="p-4 text-sm vx-muted">Select an instrument to trade.</div>;
  }

  const q = instrument.quote;
  const decimals = priceDecimals(instrument.symbol, q?.last);
  const canTrade = instrument.isExecutable && instrument.tradingEnabled;
  const vol = Number(volume) || 0;
  const refPrice = q ? (side === "BUY" ? q.ask : q.bid) : null;
  const spread = q ? q.ask - q.bid : null;
  const estMargin =
    refPrice && account ? (vol * instrument.contractSize * refPrice) / Math.max(account.leverage, 1) : 0;

  function openConfirm() {
    setError(null);
    if (!canTrade) {
      setError(instrument!.isExecutable ? "Trading is disabled for this instrument." : "This instrument is indicative-only and cannot be traded yet.");
      return;
    }
    if (!q) {
      setError("No live quote yet — try again in a moment.");
      return;
    }
    if (vol < instrument!.minVolume || vol > instrument!.maxVolume) {
      setError(`Volume must be between ${instrument!.minVolume} and ${instrument!.maxVolume}.`);
      return;
    }

    const entryLabel =
      type === "MARKET"
        ? `Market (~${refPrice?.toFixed(decimals)})`
        : type === "LIMIT"
        ? `Limit @ ${limitPrice}`
        : type === "STOP"
        ? `Stop @ ${stopPrice}`
        : `Stop-Limit @ ${stopPrice} / ${limitPrice}`;

    setPending({
      symbol: instrument!.symbol,
      side,
      type,
      volume: vol,
      entryLabel,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      estimatedMargin: estMargin,
      estimatedSpread: spread ?? 0,
      estimatedFees: 0,
      priceDecimals: decimals,
    });
  }

  async function confirm() {
    if (!pending) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/orders", {
        mode: "DEMO",
        symbol: pending.symbol,
        side: pending.side,
        type: pending.type,
        volume: pending.volume,
        limitPrice: limitPrice ? Number(limitPrice) : undefined,
        stopPrice: stopPrice ? Number(stopPrice) : undefined,
        stopLoss: pending.stopLoss,
        takeProfit: pending.takeProfit,
      });
      setPending(null);
      onOrderPlaced();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-medium vx-tabular">{instrument.symbol}</div>
        {!instrument.isExecutable && (
          <span className="text-[10px] text-vx-warn">Indicative only</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("BUY")}
          className={clsx(
            "rounded-lg py-2.5 text-sm font-semibold transition-colors",
            side === "BUY" ? "bg-vx-buy text-white" : "vx-surface-2 vx-muted"
          )}
        >
          Buy {q ? q.ask.toFixed(decimals) : "—"}
        </button>
        <button
          onClick={() => setSide("SELL")}
          className={clsx(
            "rounded-lg py-2.5 text-sm font-semibold transition-colors",
            side === "SELL" ? "bg-vx-sell text-white" : "vx-surface-2 vx-muted"
          )}
        >
          Sell {q ? q.bid.toFixed(decimals) : "—"}
        </button>
      </div>

      <div>
        <label className="block text-xs vx-muted mb-1.5">Order type</label>
        <div className="grid grid-cols-4 gap-1">
          {ORDER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={clsx(
                "rounded-md py-1.5 text-[11px] font-medium transition-colors",
                type === t ? "bg-vx-accent text-white" : "vx-surface-2 vx-muted"
              )}
            >
              {ORDER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <NumberField label={`Volume (lots, step ${instrument.volumeStep})`} value={volume} onChange={setVolume} />

      {(type === "LIMIT" || type === "STOP_LIMIT") && (
        <NumberField label="Limit price" value={limitPrice} onChange={setLimitPrice} />
      )}
      {(type === "STOP" || type === "STOP_LIMIT") && (
        <NumberField label="Stop price" value={stopPrice} onChange={setStopPrice} />
      )}

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Stop Loss" value={stopLoss} onChange={setStopLoss} optional />
        <NumberField label="Take Profit" value={takeProfit} onChange={setTakeProfit} optional />
      </div>

      <div className="vx-surface-2 rounded-lg p-3 space-y-1.5 text-xs">
        <SummaryRow label="Spread" value={spread != null ? spread.toFixed(decimals) : "—"} />
        <SummaryRow label="Est. margin" value={account ? formatMoney(estMargin) : "—"} />
        <SummaryRow label="Free margin" value={account ? formatMoney(account.freeMargin) : "—"} />
        <SummaryRow label="Order size" value={`${vol} × ${instrument.contractSize}`} />
      </div>

      {error && <div className="text-xs text-vx-sell">{error}</div>}

      <button
        onClick={openConfirm}
        className={clsx(
          "w-full rounded-lg py-3 text-sm font-semibold text-white transition-colors",
          side === "BUY" ? "bg-vx-buy hover:bg-vx-buy/90" : "bg-vx-sell hover:bg-vx-sell/90"
        )}
      >
        {side === "BUY" ? "Buy" : "Sell"} {instrument.symbol}
      </button>

      {pending && (
        <ConfirmOrderDialog order={pending} submitting={submitting} onCancel={() => setPending(null)} onConfirm={confirm} />
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs vx-muted mb-1.5">
        {label} {optional && <span className="opacity-60">(optional)</span>}
      </label>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg vx-surface-2 border border-[rgb(var(--border))] px-3 py-2 text-sm outline-none focus:border-vx-accent vx-tabular"
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="vx-muted">{label}</span>
      <span className="vx-tabular">{value}</span>
    </div>
  );
}
