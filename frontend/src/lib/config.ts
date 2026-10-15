const configuredApiBase = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const isLoopbackHost = (hostname: string) =>
  hostname === "localhost" ||
  hostname.endsWith(".localhost") ||
  hostname === "127.0.0.1" ||
  hostname === "[::1]";

// Without NEXT_PUBLIC_API_URL, production builds call the API on the page's own address: the
// single-app deployment (repository-root app.js) serves the site and /api together.
if (configuredApiBase) {
  let apiUrl: URL;
  try {
    apiUrl = new URL(configuredApiBase);
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL must be an absolute HTTP(S) URL");
  }
  if (
    !["http:", "https:"].includes(apiUrl.protocol) ||
    apiUrl.pathname !== "/" ||
    apiUrl.username !== "" ||
    apiUrl.password !== "" ||
    apiUrl.search !== "" ||
    apiUrl.hash !== "" ||
    process.env.NODE_ENV === "production" && apiUrl.protocol !== "https:" ||
    process.env.NODE_ENV === "production" && isLoopbackHost(apiUrl.hostname)
  ) {
    throw new Error("NEXT_PUBLIC_API_URL must use a public HTTPS origin in production");
  }
}

/** API origin; "" means the page's own address (same-origin requests to /api/...). */
export const API_BASE =
  configuredApiBase ?? (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

const configuredWsBase = process.env.NEXT_PUBLIC_WS_URL?.trim() || undefined;
if (configuredWsBase) {
  let wsUrl: URL;
  try {
    wsUrl = new URL(configuredWsBase);
  } catch {
    throw new Error("NEXT_PUBLIC_WS_URL must be an absolute WS(S) URL");
  }
  if (
    !["ws:", "wss:"].includes(wsUrl.protocol) ||
    wsUrl.username !== "" ||
    wsUrl.password !== "" ||
    wsUrl.search !== "" ||
    wsUrl.hash !== "" ||
    process.env.NODE_ENV === "production" &&
      (wsUrl.protocol !== "wss:" || isLoopbackHost(wsUrl.hostname))
  ) {
    throw new Error("NEXT_PUBLIC_WS_URL must use a public WSS origin in production");
  }
}

const WS_BASE =
  configuredWsBase ??
  (configuredApiBase
    ? process.env.NODE_ENV === "development"
      ? `${configuredApiBase.replace(/^https:/, "wss:").replace(/^http:/, "ws:")}/ws`
      : ""
    : process.env.NODE_ENV === "development"
      ? "ws://localhost:4000/ws"
      : "");

/**
 * Market WebSocket URL, or "" when streaming is disabled (prices then refresh by polling).
 * Same-origin production builds connect to /ws on the page's own address.
 */
export function marketSocketUrl(): string {
  if (WS_BASE) return WS_BASE;
  if (!configuredApiBase && process.env.NODE_ENV === "production" && typeof window !== "undefined") {
    return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
  }
  return "";
}

export const MARKET_POLL_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_MARKET_POLL_INTERVAL_MS ?? 10_000);
if (!Number.isInteger(MARKET_POLL_INTERVAL_MS) || MARKET_POLL_INTERVAL_MS < 1_000) {
  throw new Error("NEXT_PUBLIC_MARKET_POLL_INTERVAL_MS must be an integer of at least 1000");
}
