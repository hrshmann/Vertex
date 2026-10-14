import { pool } from "../../db/pool";
import { Instrument } from "../../types";

let bySymbol = new Map<string, Instrument>();
let byId = new Map<string, Instrument>();

function mapRow(row: any): Instrument {
  return {
    id: row.id,
    symbol: row.symbol,
    class: row.class,
    baseAsset: row.base_asset,
    quoteAsset: row.quote_asset,
    provider: row.provider,
    providerSymbol: row.provider_symbol,
    isExecutable: row.is_executable,
    contractSize: Number(row.contract_size),
    minVolume: Number(row.min_volume),
    maxVolume: Number(row.max_volume),
    volumeStep: Number(row.volume_step),
    maxLeverage: row.max_leverage,
    tradingEnabled: row.trading_enabled,
  };
}

export async function loadInstrumentCache(): Promise<void> {
  const res = await pool.query("SELECT * FROM instruments ORDER BY symbol");
  bySymbol = new Map(res.rows.map((r) => [r.symbol, mapRow(r)]));
  byId = new Map(res.rows.map((r) => [r.id, mapRow(r)]));
  console.log(`[instruments] loaded ${bySymbol.size} instruments`);
}

export function getInstrumentBySymbol(symbol: string): Instrument | undefined {
  return bySymbol.get(symbol);
}

export function getInstrumentById(id: string): Instrument | undefined {
  return byId.get(id);
}

export function listInstruments(): Instrument[] {
  return Array.from(bySymbol.values());
}
