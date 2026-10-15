import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nodeEnv = process.env.NODE_ENV ?? "development";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? (nodeEnv === "production" ? undefined : fallback);
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredDatabaseSetting(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const databasePort = Number(requiredDatabaseSetting("DB_PORT"));
if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
  throw new Error("DB_PORT must be an integer between 1 and 65535");
}

const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const corsOrigins = (process.env.CORS_ORIGIN ?? (nodeEnv === "production" ? "" : "http://localhost:3000"))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (corsOrigins.length === 0) {
  throw new Error("Missing required environment variable: CORS_ORIGIN");
}
for (const origin of corsOrigins) {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error("CORS_ORIGIN must contain valid absolute origins");
  }
  if (parsed.origin !== origin || parsed.protocol !== "https:" && nodeEnv === "production") {
    throw new Error("CORS_ORIGIN must contain HTTPS origins in production");
  }
}

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? (nodeEnv === "production" ? 1 : 0));
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
}

const jwtAccessSecret = required("JWT_ACCESS_SECRET", "dev-insecure-access-secret-change-me");
const jwtRefreshSecret = required("JWT_REFRESH_SECRET", "dev-insecure-refresh-secret-change-me");
const jwtAdminSecret = required("JWT_ADMIN_SECRET", "dev-insecure-admin-secret-change-me");
const encryptionKey = required(
  "ENCRYPTION_KEY",
  "0000000000000000000000000000000000000000000000000000000000000000"
);
if (nodeEnv === "production") {
  const secrets = [jwtAccessSecret, jwtRefreshSecret, jwtAdminSecret];
  if (secrets.some((secret) => secret.length < 32) || new Set(secrets).size !== secrets.length) {
    throw new Error("Production JWT secrets must be distinct and at least 32 characters long");
  }
  if (encryptionKey === "0000000000000000000000000000000000000000000000000000000000000000" ||
      (!/^[0-9a-fA-F]{64}$/.test(encryptionKey) && encryptionKey.length < 32)) {
    throw new Error("ENCRYPTION_KEY must be a non-default 32-byte key or a 32-character passphrase in production");
  }
}

export const env = {
  nodeEnv,
  port,

  databaseHost: requiredDatabaseSetting("DB_HOST"),
  databasePort,
  databaseUser: requiredDatabaseSetting("DB_USER"),
  databasePassword: requiredDatabaseSetting("DB_PASSWORD"),
  databaseName: requiredDatabaseSetting("DB_NAME"),
  databaseConnectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  databaseIdleTimeoutMs: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 15_000),
  databaseSsl: process.env.DB_SSL === "true",

  // Signing secrets — MUST be overridden in production via .env (never committed).
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  jwtRefreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? 7),
  // Separate secret/token namespace from user auth, so a leaked user token can never be replayed as an admin token.
  jwtAdminSecret,
  jwtAdminTtl: process.env.JWT_ADMIN_TTL ?? "8h",

  // Field-level encryption key for secrets-at-rest (API keys, 2FA secrets). 32-byte hex in prod.
  encryptionKey,

  corsOrigins,
  trustProxyHops,

  // Market data — see the repository README for provider notes.
  // Binance public market endpoints need no key for ticker/kline data.
  binanceWsBase: process.env.BINANCE_WS_BASE ?? "wss://stream.binance.com:9443",
  binanceRestBase: process.env.BINANCE_REST_BASE ?? "https://api.binance.com",
  // Frankfurter.app — free, keyless, ECB reference rates. Daily, NOT real-time: used only
  // as an indicative forex feed until a real-time forex data/broker API key is supplied.
  forexIndicativeBase: process.env.FOREX_INDICATIVE_BASE ?? "https://api.frankfurter.app",
  forexPollIntervalMs: Number(process.env.FOREX_POLL_INTERVAL_MS ?? 60_000),

  isProd(): boolean {
    return this.nodeEnv === "production";
  },
};
