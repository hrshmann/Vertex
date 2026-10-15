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
import { adminUsersRouter } from "./users.routes";

const adminRow = { email: "admin@example.invalid", role: "SUPER_ADMIN", is_active: 1 };

describe("admin routes with mocked persistence", () => {
  let server: Server;
  let baseUrl: string;
  const headers = { cookie: "vx_admin=test-admin-token", "content-type": "application/json" };

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.verifyAdminToken.mockReturnValue({ sub: "admin-1", email: adminRow.email, role: "SUPER_ADMIN" });
    mocks.poolQuery.mockResolvedValue({ rows: [adminRow], rowCount: 1, insertId: 0 });
    mocks.query.mockResolvedValue({ rows: [], rowCount: 1, insertId: 0 });

    const app = express();
    app.use(express.json());
    app.use(cookieParser());
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

  const suspend = () => fetch(`${baseUrl}/api/admin/users/user-1/suspend`, { method: "POST", headers });

  it("rejects a valid token for a deactivated admin", async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ ...adminRow, is_active: 0 }], rowCount: 1, insertId: 0 });
    const response = await suspend();
    expect(response.status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("uses the admin's current role from the database, not the token", async () => {
    mocks.poolQuery.mockResolvedValue({ rows: [{ ...adminRow, role: "SUPPORT" }], rowCount: 1, insertId: 0 });
    const response = await suspend();
    expect(response.status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("revokes a user's sessions when suspending them", async () => {
    const response = await suspend();
    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE user_sessions"), ["user-1"]);
  });
});
