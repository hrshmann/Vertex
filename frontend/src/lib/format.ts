import { CURRENCIES } from "./instruments";

/**
 * Display precision for a price. Forex follows market convention: 5 decimals, 3 for pairs
 * worth over 100 (JPY), fewer for currencies like KRW. Crypto scales with price so low-priced
 * coins keep their real precision (PEPE and SHIB trade in millionths of a dollar).
 */
export function priceDecimals(symbol: string, price?: number | null): number {
  const [base, quote] = symbol.split("/");
  const magnitude = Math.abs(price ?? 100);
  if (CURRENCIES[base] && CURRENCIES[quote]) {
    if (quote === "JPY" || magnitude >= 100) return magnitude >= 1000 ? 2 : 3;
    return magnitude >= 10 ? 4 : 5;
  }
  if (magnitude >= 100) return 2;
  if (magnitude >= 1) return 4;
  if (magnitude >= 0.01) return 5;
  if (magnitude >= 0.0001) return 7;
  return 10;
}

/** 1.24B, 380.5M, 12.3K: volumes and other large amounts in a narrow column. */
export function formatCompact(value: number | null | undefined, prefix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return prefix + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: value >= 1000 ? 1 : 2 }).format(value);
}

/** +1.24% / -0.80%. */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
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

/** A price with thousands separators, e.g. 82,242.62. Fixed locale, so server and browser agree. */
export function formatPrice(value: number | null | undefined, decimals: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
