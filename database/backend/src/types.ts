export type AccountMode = "DEMO" | "LIVE";
export type AccountTier = "STANDARD" | "PRO" | "VIP";
export type InstrumentClass = "FOREX" | "CRYPTO";
export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
export type OrderStatus =
  | "PENDING"
  | "OPEN"
  | "FILLED"
  | "PARTIALLY_FILLED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED";
export type RiskState = "NORMAL" | "MARGIN_WARNING" | "MARGIN_CALL" | "STOP_OUT";

export interface Quote {
  instrumentId: string;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null;
  change24hPct: number | null;
  isIndicative: boolean;
  source: string; // provider name, e.g. "binance" | "frankfurter"
  sourceTs: string; // ISO timestamp from the upstream provider
}

export interface Instrument {
  id: string;
  symbol: string;
  class: InstrumentClass;
  baseAsset: string;
  quoteAsset: string;
  provider: string;
  providerSymbol: string;
  isExecutable: boolean;
  contractSize: number;
  minVolume: number;
  maxVolume: number;
  volumeStep: number;
  maxLeverage: number;
  tradingEnabled: boolean;
}

export interface AuthTokenPayload {
  sub: string; // user id
  email: string;
}

export interface Account {
  id: string;
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number | null;
  unrealizedPnl: number;
  currency: string;
  mode: AccountMode;
  riskState: RiskState;
  leverage: number;
}

/**
 * TradingProvider — the abstraction order placement routes through.
 * A DEMO implementation (DemoProvider) fills orders internally against live quotes.
 * A LIVE implementation would call out to an authorized broker/exchange's official API —
 * see backend/README.md. No LIVE adapter is implemented here: the spec this is built from
 * requires real broker credentials and API documentation before any such adapter is written,
 * and none were supplied.
 */
export interface TradingProvider {
  getAccount(tradingAccountId: string): Promise<Account>;
  getBalances(tradingAccountId: string): Promise<{ cashBalance: number; usedMargin: number }>;
  getPositions(tradingAccountId: string): Promise<any[]>;
  getOrders(tradingAccountId: string): Promise<any[]>;
  getQuote(symbol: string): Promise<Quote | undefined>;
  placeOrder(tradingAccountId: string, input: PlaceOrderInput): Promise<any>;
  modifyOrder(orderId: string, patch: Partial<PlaceOrderInput>): Promise<any>;
  cancelOrder(orderId: string): Promise<void>;
  closePosition(positionId: string, volume?: number): Promise<any>;
}

export interface PlaceOrderInput {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  volume: number;
  limitPrice?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}
