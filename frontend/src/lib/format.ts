const FIAT = new Set(["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"]);

/**
 * Display precision for a price. Forex follows market convention (5 decimals, 3 for JPY
 * pairs); crypto scales with price so low-priced coins (e.g. XRP) keep their real precision.
 */
export function priceDecimals(symbol: string, price?: number | null): number {
  const [base, quote] = symbol.split("/");
  if (FIAT.has(base) && FIAT.has(quote)) return quote === "JPY" ? 3 : 5;
  const magnitude = Math.abs(price ?? 100);
  if (magnitude >= 100) return 2;
  if (magnitude >= 1) return 4;
  return 6;
}
