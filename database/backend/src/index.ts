import express from "express";
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

async function main() {
  const app = express();
  const server = http.createServer(app);

  app.use(helmet());
  app.use(
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
  );
  app.set("trust proxy", env.trustProxyHops);
  app.use(express.json({ limit: "15mb" })); // generous enough for base64 KYC uploads in MVP
  app.use(cookieParser());
  app.use(apiRateLimiter);

  const hub = new WsHub(server, env.corsOrigins);
  const demoEngine = new DemoTradingEngine(hub);

  app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  const marketData = await startMarketData(hub, demoEngine);

  server.listen(env.port, "0.0.0.0", () => {
    console.log(`[vertex-trading-backend] listening on configured port (${env.nodeEnv})`);
    console.log("[vertex-trading-backend] WebSocket gateway enabled at /ws");
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

main().catch((err) => {
  console.error("[fatal] failed to start server", err);
  process.exit(1);
});
