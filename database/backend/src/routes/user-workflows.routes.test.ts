import cookieParser from "cookie-parser";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  verifyAccessToken: vi.fn(),
  resolveAccountId: vi.fn(),
  ensureDemoAccount: vi.fn(),
  getAccount: vi.fn(),
  getBalances: vi.fn(),
  getOrders: vi.fn(),
  getPositions: vi.fn(),
  placeOrder: vi.fn(),
  closePosition: vi.fn(),
}));

vi.mock("./mariaDbQuery", () => ({ query: mocks.query }));
vi.mock("../utils/jwt", () => ({ verifyAccessToken: mocks.verifyAccessToken }));
vi.mock("../services/trading/accountResolver", () => ({
  resolveAccountId: mocks.resolveAccountId,
}));

import { requireAuth } from "../middleware/auth";
import { errorHandler } from "../middleware/errorHandler";
import { accountRouter } from "./account.routes";
import { depositsRouter } from "./deposits.routes";
import { kycRouter } from "./kyc.routes";
import { notificationsRouter } from "./notifications.routes";
import { ordersRouter } from "./orders.routes";
import { positionsRouter } from "./positions.routes";
import { withdrawalsRouter } from "./withdrawals.routes";

const userId = "test-user-id";

describe("user-specific routes with mocked persistence and trading", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM kyc_profiles WHERE user_id")) {
        return { rows: [{ id: "kyc-test-id", user_id: userId, status: "PENDING" }], rowCount: 1, insertId: 0 };
      }
      return { rows: [], rowCount: 0, insertId: 0 };
    });
    mocks.verifyAccessToken.mockImplementation((token: string) => {
      if (token !== "test-access-token") throw new Error("invalid token");
      return { sub: userId, email: "smoke@example.invalid" };
    });
    mocks.resolveAccountId.mockResolvedValue("test-account-id");
    mocks.ensureDemoAccount.mockResolvedValue("test-account-id");
    mocks.getAccount.mockResolvedValue({ id: "test-account-id", mode: "DEMO", balance: 10000 });
    mocks.getBalances.mockResolvedValue({ cashBalance: 10000, usedMargin: 0 });
    mocks.getOrders.mockResolvedValue([]);
    mocks.getPositions.mockResolvedValue([]);
    mocks.placeOrder.mockResolvedValue({ id: "test-order-id" });
    mocks.closePosition.mockResolvedValue(undefined);

    const engine = {
      ensureDemoAccount: mocks.ensureDemoAccount,
      getAccount: mocks.getAccount,
      getBalances: mocks.getBalances,
      getOrders: mocks.getOrders,
      getPositions: mocks.getPositions,
      placeOrder: mocks.placeOrder,
      closePosition: mocks.closePosition,
    } as never;

    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api/account", accountRouter(engine));
    app.use("/api/orders", ordersRouter(engine));
    app.use("/api/positions", positionsRouter(engine));
    app.use("/api/notifications", notificationsRouter());
    app.use("/api/kyc", kycRouter());
    app.use("/api/deposits", depositsRouter(engine));
    app.use("/api/withdrawals", withdrawalsRouter(engine));
    app.use(errorHandler);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  it("allows authenticated account, position, order, notification, KYC, deposit, and withdrawal reads", async () => {
    const headers = { cookie: "vx_access=test-access-token" };
    const checks = [
      ["/api/account", 200],
      ["/api/account/balance", 200],
      ["/api/account/transactions", 200],
      ["/api/orders", 200],
      ["/api/positions", 200],
      ["/api/notifications", 200],
      ["/api/kyc", 200],
      ["/api/deposits", 200],
      ["/api/withdrawals", 200],
    ] as const;

    for (const [path, expectedStatus] of checks) {
      const response = await fetch(`${baseUrl}${path}`, { headers });
      expect(response.status, path).toBe(expectedStatus);
    }

    expect(mocks.resolveAccountId).toHaveBeenCalled();
    expect(mocks.getAccount).toHaveBeenCalledWith("test-account-id");
    expect(mocks.getPositions).toHaveBeenCalledWith("test-account-id");
    expect(mocks.getOrders).toHaveBeenCalledWith("test-account-id");
  });

  it("rejects unauthenticated user-specific reads", async () => {
    for (const path of ["/api/account", "/api/orders", "/api/positions", "/api/notifications", "/api/kyc", "/api/deposits", "/api/withdrawals"]) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status, path).toBe(401);
    }
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("rejects invalid order, deposit, withdrawal, and KYC input before persistence", async () => {
    const requests = [
      ["/api/orders", { method: "POST", body: {} }],
      ["/api/deposits", { method: "POST", body: {} }],
      ["/api/withdrawals", { method: "POST", body: {} }],
      ["/api/kyc/documents", { method: "POST", body: {} }],
    ] as const;

    for (const [path, request] of requests) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: request.method,
        headers: { cookie: "vx_access=test-access-token", "content-type": "application/json" },
        body: JSON.stringify(request.body),
      });
      expect(response.status, path).toBe(400);
    }

    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.placeOrder).not.toHaveBeenCalled();
  });

  it("does not close a position that the authenticated user does not own", async () => {
    const response = await fetch(`${baseUrl}/api/positions/not-owned/close`, {
      method: "POST",
      headers: { cookie: "vx_access=test-access-token", "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(404);
    expect(mocks.closePosition).not.toHaveBeenCalled();
  });
});
