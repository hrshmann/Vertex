import { Instrument, OrderSide, RiskState } from "../../types";

export interface OpenPositionForRisk {
  instrument: Instrument;
  side: OrderSide;
  volume: number;
  entryPrice: number;
  currentPrice: number;
}

/** Required margin to open a position of this size, given account leverage. */
export function calcRequiredMargin(instrument: Instrument, volume: number, price: number, leverage: number): number {
  const notional = volume * instrument.contractSize * price;
  return notional / Math.max(leverage, 1);
}

export function calcUnrealizedPnl(pos: OpenPositionForRisk): number {
  const direction = pos.side === "BUY" ? 1 : -1;
  const diff = pos.currentPrice - pos.entryPrice;
  return direction * diff * pos.volume * pos.instrument.contractSize;
}

export interface MarginSnapshot {
  balance: number;
  usedMargin: number;
  unrealizedPnl: number;
  equity: number;
  freeMargin: number;
  marginLevel: number | null; // equity / usedMargin * 100, null if no used margin
  riskState: RiskState;
}

/**
 * Server-side margin/risk calculation. Thresholds are deliberately simple and conservative
 * for a demo MVP; production values belong in system_settings (admin-configurable), not here.
 */
const MARGIN_WARNING_LEVEL = 150; // %
const MARGIN_CALL_LEVEL = 100; // %
const STOP_OUT_LEVEL = 50; // %

export function computeMarginSnapshot(balance: number, usedMargin: number, unrealizedPnl: number): MarginSnapshot {
  const equity = balance + unrealizedPnl;
  const freeMargin = equity - usedMargin;
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : null;

  let riskState: RiskState = "NORMAL";
  if (marginLevel !== null) {
    if (marginLevel <= STOP_OUT_LEVEL) riskState = "STOP_OUT";
    else if (marginLevel <= MARGIN_CALL_LEVEL) riskState = "MARGIN_CALL";
    else if (marginLevel <= MARGIN_WARNING_LEVEL) riskState = "MARGIN_WARNING";
  }

  return { balance, usedMargin, unrealizedPnl, equity, freeMargin, marginLevel, riskState };
}
