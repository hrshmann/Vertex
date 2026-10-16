/** Plain-language names for the listed instruments; unknown symbols fall back to the symbol. */
const COINS: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  XRP: "XRP",
  BNB: "BNB",
  SOL: "Solana",
  DOGE: "Dogecoin",
  ADA: "Cardano",
  HYPE: "Hyperliquid",
  LINK: "Chainlink",
  BCH: "Bitcoin Cash",
  XLM: "Stellar",
  AVAX: "Avalanche",
  SUI: "Sui",
  HBAR: "Hedera",
  LTC: "Litecoin",
  TON: "Toncoin",
  SHIB: "Shiba Inu",
  DOT: "Polkadot",
  ZEC: "Zcash",
  UNI: "Uniswap",
  NEAR: "NEAR Protocol",
  AAVE: "Aave",
  PEPE: "Pepe",
  ICP: "Internet Computer",
  APT: "Aptos",
  ETC: "Ethereum Classic",
  ENA: "Ethena",
  ONDO: "Ondo",
  POL: "Polygon",
  TAO: "Bittensor",
  ATOM: "Cosmos",
  WLD: "Worldcoin",
  ARB: "Arbitrum",
  FIL: "Filecoin",
  ALGO: "Algorand",
  RENDER: "Render",
  VET: "VeChain",
  QNT: "Quant",
  SKY: "Sky",
  FET: "Artificial Superintelligence Alliance",
  TRUMP: "Official Trump",
  OP: "Optimism",
  INJ: "Injective",
  SEI: "Sei",
  STX: "Stacks",
  BONK: "Bonk",
  TIA: "Celestia",
  PENGU: "Pudgy Penguins",
  IMX: "Immutable",
  LDO: "Lido DAO",
  GRT: "The Graph",
  CRV: "Curve DAO",
  FLOKI: "Floki",
  PYTH: "Pyth Network",
  WIF: "dogwifhat",
  JTO: "Jito",
  PENDLE: "Pendle",
  STRK: "Starknet",
  ZRO: "LayerZero",
  ETHFI: "ether.fi",
  EIGEN: "EigenLayer",
  ZK: "ZKsync",
  DASH: "Dash",
  XTZ: "Tezos",
  SAND: "The Sandbox",
  MANA: "Decentraland",
  AXS: "Axie Infinity",
  CHZ: "Chiliz",
  COMP: "Compound",
  SNX: "Synthetix",
  APE: "ApeCoin",
};

/** Currency names, and the short sign shown on each currency's badge. */
export const CURRENCIES: Record<string, { name: string; sign: string }> = {
  USD: { name: "US dollar", sign: "$" },
  EUR: { name: "Euro", sign: "€" },
  GBP: { name: "British pound", sign: "£" },
  JPY: { name: "Japanese yen", sign: "¥" },
  CHF: { name: "Swiss franc", sign: "Fr" },
  AUD: { name: "Australian dollar", sign: "A$" },
  CAD: { name: "Canadian dollar", sign: "C$" },
  NZD: { name: "New Zealand dollar", sign: "NZ$" },
  SEK: { name: "Swedish krona", sign: "kr" },
  NOK: { name: "Norwegian krone", sign: "kr" },
  DKK: { name: "Danish krone", sign: "kr" },
  PLN: { name: "Polish złoty", sign: "zł" },
  HUF: { name: "Hungarian forint", sign: "Ft" },
  CZK: { name: "Czech koruna", sign: "Kč" },
  TRY: { name: "Turkish lira", sign: "₺" },
  ZAR: { name: "South African rand", sign: "R" },
  MXN: { name: "Mexican peso", sign: "$" },
  BRL: { name: "Brazilian real", sign: "R$" },
  SGD: { name: "Singapore dollar", sign: "S$" },
  HKD: { name: "Hong Kong dollar", sign: "HK$" },
  CNY: { name: "Chinese yuan", sign: "¥" },
  INR: { name: "Indian rupee", sign: "₹" },
  THB: { name: "Thai baht", sign: "฿" },
  KRW: { name: "South Korean won", sign: "₩" },
  ILS: { name: "Israeli shekel", sign: "₪" },
};

/** Coins with a logo in public/coins (the rest get a generated badge). */
export const COIN_LOGOS = new Set(
  "AAVE ADA ALGO APE APT ARB ATOM AVAX AXS BCH BNB BONK BTC CHZ COMP CRV DASH DOGE DOT EIGEN ENA ETC ETH ETHFI FET FIL FLOKI GRT HBAR HYPE ICP IMX INJ LDO LINK LTC MANA NEAR ONDO OP PENDLE PENGU PEPE POL PYTH QNT RENDER SAND SEI SHIB SNX SOL STRK STX SUI TAO TIA TRUMP UNI VET WIF WLD XLM XRP XTZ ZEC ZK".split(
    " "
  )
);

export function instrumentName(symbol: string): string {
  const [base, quote] = symbol.split("/");
  if (CURRENCIES[base] && CURRENCIES[quote]) return `${CURRENCIES[base].name} / ${CURRENCIES[quote].name}`;
  return COINS[base] ?? symbol;
}

const SOURCES: Record<string, string> = {
  coinbase: "Coinbase",
  binance: "Binance",
  kraken: "Kraken",
  frankfurter: "European Central Bank, daily rate",
};

export const sourceName = (source: string | null | undefined) => (source ? SOURCES[source] ?? source : "");

/** True for quotes that only change once a day (the ECB reference-rate fallback). */
export const isDailyRate = (source: string | null | undefined) => source === "frankfurter";
