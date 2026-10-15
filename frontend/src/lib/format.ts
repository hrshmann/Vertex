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

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** $10,400.00 */
export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value);
  return value == null || Number.isNaN(n) ? "—" : usd.format(n);
}

/** +$12.40 / −$3.10, for profit and loss. */
export function formatSignedMoney(value: number | string | null | undefined): string {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${usd.format(Math.abs(n))}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** "just now", "5 min ago", "3 h ago", then a date. */
export function timeAgo(value: string): string {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
