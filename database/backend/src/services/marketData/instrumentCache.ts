import { pool } from "../../db/pool";
import { Instrument } from "../../types";
import { catalogRank, INSTRUMENT_CATALOG } from "./instrumentCatalog";

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

/** Adds catalog markets missing from the instruments table; existing rows are left as they are. */
async function syncCatalog(): Promise<void> {
  const columns = INSTRUMENT_CATALOG.map(() => "(?,?,?,?,?,?,FALSE)").join(",");
  const params = INSTRUMENT_CATALOG.flatMap((e) => [e.symbol, e.class, e.baseAsset, e.quoteAsset, e.provider, e.providerSymbol]);
  const res = await pool.query(
    `INSERT IGNORE INTO instruments (symbol, class, base_asset, quote_asset, provider, provider_symbol, is_executable) VALUES ${columns}`,
    params
  );
  if (res.rowCount) console.log(`[instruments] added ${res.rowCount} new markets from the catalog`);
}

export async function loadInstrumentCache(): Promise<void> {
  await syncCatalog();
  const res = await pool.query("SELECT * FROM instruments");
  // Map insertion order is display order: listInstruments() returns markets largest first.
  res.rows.sort((a, b) => catalogRank(a.symbol) - catalogRank(b.symbol) || String(a.symbol).localeCompare(b.symbol));
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
