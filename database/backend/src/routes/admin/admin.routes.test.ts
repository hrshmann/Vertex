import cookieParser from "cookie-parser";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  txQuery: vi.fn(),
  query: vi.fn(),
  verifyAdminToken: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("../../db/pool", () => ({
  pool: { query: mocks.poolQuery },
  withTransaction: (fn: (client: { query: typeof mocks.txQuery }) => Promise<unknown>) =>
    fn({ query: mocks.txQuery }),
}));
vi.mock("../mariaDbQuery", () => ({ query: mocks.query }));
vi.mock("../../utils/jwt", () => ({ verifyAdminToken: mocks.verifyAdminToken }));
vi.mock("../../utils/audit", () => ({ logAudit: mocks.logAudit }));

import { errorHandler } from "../../middleware/errorHandler";
import { adminWithdrawalsRouter } from "./withdrawals.routes";
import { adminUsersRouter } from "./users.routes";

const adminRow = { email: "admin@example.invalid", role: "SUPER_ADMIN", is_active: 1 };
const withdrawal = {
  id: "withdrawal-1",
  trading_account_id: "account-1",
  amount: "100.00",
  currency: "USD",
};

describe("admin routes with mocked persistence", () => {
  let server: Server;
  let baseUrl: string;
  const headers = { cookie: "vx_admin=test-admin-token", "content-type": "application/json" };

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.verifyAdminToken.mockReturnValue({ sub: "admin-1", email: adminRow.email, role: "SUPER_ADMIN" });
    mocks.poolQuery.mockResolvedValue({ rows: [adminRow], rowCount: 1, insertId: 0 });
    mocks.query.mockResolvedValue({ rows: [], rowCount: 1, insertId: 0 });
    mocks.txQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT * FROM withdrawals")) return { rows: [withdrawal], rowCount: 1, insertId: 0 };
      if (sql.includes("SELECT user_id")) return { rows: [{ user_id: "user-1" }], rowCount: 1, insertId: 0 };
      return { rows: [], rowCount: 1, insertId: 0 };
    });

    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api/admin/withdrawals", adminWithdrawalsRouter());
    app.use("/api/admin/users", adminUsersRouter());
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

  const approve = () =>
    fetch(`${baseUrl}/api/admin/withdrawals/withdrawal-1/decision`, {
      method: "POST",
      headers,
      body: JSON.stringify({ status: "APPROVED" }),
    });

  it("rejects a valid token for a deactivated admin", async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ ...adminRow, is_active: 0 }], rowCount: 1, insertId: 0 });
    const response = await approve();
    expect(response.status).toBe(401);
    expect(mocks.txQuery).not.toHaveBeenCalled();
  });

  it("uses the admin's current role from the database, not the token", async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ ...adminRow, role: "SUPPORT" }], rowCount: 1, insertId: 0 });
    const response = await approve();
    expect(response.status).toBe(403);
  });

  it("approves a withdrawal when free margin covers it", async () => {
    const response = await approve();
    expect(response.status).toBe(200);
    expect(mocks.txQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO transactions"),
      expect.anything()
    );
  });

  it("refuses approval when free margin no longer covers the withdrawal", async () => {
    const base = mocks.txQuery.getMockImplementation()!;
    mocks.txQuery.mockImplementation(async (sql: string, params?: unknown[]) =>
      sql.includes("UPDATE balances") ? { rows: [], rowCount: 0, insertId: 0 } : base(sql, params)
    );
    const response = await approve();
    expect(response.status).toBe(409);
    expect(mocks.txQuery).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO transactions"),
      expect.anything()
    );
  });

  it("revokes a user's sessions when suspending them", async () => {
    const response = await fetch(`${baseUrl}/api/admin/users/user-1/suspend`, { method: "POST", headers });
    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE user_sessions"), ["user-1"]);
  });
});
