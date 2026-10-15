export type InstrumentClass = "FOREX" | "CRYPTO";
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
