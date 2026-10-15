import express, { RequestHandler } from "express";
import http from "node:http";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRateLimiter } from "./middleware/rateLimit";
import { WsHub } from "./services/ws/wsHub";
import { DemoTradingEngine } from "./services/trading/demoEngine";
import { startMarketData } from "./services/marketData";
import { getAllQuotes } from "./services/marketData/quoteCache";
import { pool } from "./db/pool";

import { authRouter } from "./routes/auth.routes";
import { marketsRouter } from "./routes/markets.routes";
import { accountRouter } from "./routes/account.routes";
import { ordersRouter } from "./routes/orders.routes";
import { positionsRouter } from "./routes/positions.routes";
import { kycRouter } from "./routes/kyc.routes";
import { depositsRouter } from "./routes/deposits.routes";
import { withdrawalsRouter } from "./routes/withdrawals.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { complianceRouter } from "./routes/compliance.routes";
import { adminRouter } from "./routes/admin";

export interface StartServerOptions {
  /**
   * Serves every request that isn't for the API (/api, /health) or the WebSocket (/ws). The
   * single-app Hostinger deployment passes the Next.js website's request handler here, so the
   * site and API share one address. Without it, other paths get a JSON 404.
   */
  frontendHandler?: (req: http.IncomingMessage, res: http.ServerResponse) => unknown;
}

function isApiPath(path: string): boolean {
  return path === "/api" || path.startsWith("/api/") || path === "/health" || path.startsWith("/health/");
}

/** Applies middleware to API requests only, leaving website pages and assets untouched. */
function apiOnly(middleware: RequestHandler): RequestHandler {
  return (req, res, next) => (isApiPath(req.path) ? middleware(req, res, next) : next());
}

export async function startServer(options: StartServerOptions = {}) {
  const app = express();
  const server = http.createServer(app);

  app.set("trust proxy", env.trustProxyHops);
  app.use(apiOnly(helmet()));
  app.use(
    apiOnly(
      cors({
        origin: (origin, callback) => {
          if (!origin || env.corsOrigins.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(null, false);
        },
        credentials: true,
      })
    )
  );
  app.use(apiOnly(express.json({ limit: "15mb" }))); // generous enough for base64 KYC uploads in MVP
  app.use(apiOnly(cookieParser()));
  app.use(apiOnly(apiRateLimiter));

  const hub = new WsHub(server, env.corsOrigins);
  const demoEngine = new DemoTradingEngine(hub);

  app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  // Deployment check: database reachability, which feed each quote currently comes from, and
  // the client IP as the API sees it (it should be your own IP; if it is a proxy's address,
  // TRUST_PROXY_HOPS is wrong and every visitor would share one rate limit).
  app.get("/health/ready", async (req, res) => {
    let database = "ok";
    try {
      await pool.query("SELECT 1");
    } catch (err) {
      database = `error: ${(err as { code?: string }).code ?? "unreachable"}`;
    }
    const quotes = getAllQuotes();
    const quoteSources: Record<string, number> = {};
    for (const quote of quotes) quoteSources[quote.source] = (quoteSources[quote.source] ?? 0) + 1;
    res.status(database === "ok" ? 200 : 503).json({
      ok: database === "ok",
      database,
      quotes: quotes.length,
      quoteSources,
      websocketClients: hub.connectedCount,
      clientIp: req.ip,
      ts: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRouter(demoEngine));
  app.use("/api/markets", marketsRouter());
  app.use("/api/account", accountRouter(demoEngine));
  app.use("/api/orders", ordersRouter(demoEngine));
  app.use("/api/positions", positionsRouter(demoEngine));
  app.use("/api/kyc", kycRouter());
  app.use("/api/deposits", depositsRouter(demoEngine));
  app.use("/api/withdrawals", withdrawalsRouter(demoEngine));
  app.use("/api/notifications", notificationsRouter());
  app.use("/api/compliance", complianceRouter());
  app.use("/api/admin", adminRouter());

  const { frontendHandler } = options;
  if (frontendHandler) {
    app.use("/api", notFoundHandler);
    app.use((req, res, next) => {
      Promise.resolve(frontendHandler(req, res)).catch(next);
    });
  } else {
    app.use(notFoundHandler);
  }
  app.use(errorHandler);

  await checkDatabaseConnection();
  const marketData = await startMarketData(hub, demoEngine);

  server.listen(env.port, "0.0.0.0", () => {
    console.log(`[vertex-trading-backend] listening on configured port (${env.nodeEnv})`);
    console.log("[vertex-trading-backend] WebSocket gateway enabled at /ws");
    if (frontendHandler) console.log("[vertex-trading-backend] serving the website on the same address");
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[vertex-trading-backend] received ${signal}; shutting down`);
    marketData.stop();
    hub.close();
    server.close((error) => {
      if (error) {
        console.error("[vertex-trading-backend] HTTP server shutdown failed", error);
        process.exitCode = 1;
      }
      void pool.end().then(
        () => process.exit(),
        (poolError) => {
          console.error("[vertex-trading-backend] database pool shutdown failed", poolError);
          process.exit(1);
        }
      );
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

/** Fails startup with an actionable message instead of a bare driver error. */
async function checkDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    const code = (err as { code?: string }).code ?? "UNKNOWN";
    const hint =
      code === "ER_ACCESS_DENIED_ERROR" || code === "ER_DBACCESS_DENIED_ERROR"
        ? "Check DB_USER, DB_PASSWORD and DB_NAME against hPanel → Databases."
        : code === "ER_TOO_MANY_USER_CONNECTIONS" || code === "ER_USER_LIMIT_REACHED"
          ? "The database user hit its connection limit; lower DB_CONNECTION_LIMIT and redeploy."
          : "On Hostinger, set DB_HOST=localhost. From another machine, allow its IP under hPanel → Databases → Remote MySQL.";
    console.error(`[fatal] cannot connect to database ${env.databaseName} at ${env.databaseHost}:${env.databasePort} (${code}). ${hint}`);
    throw err;
  }
}
