import cookieParser from "cookie-parser";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  sessions: new Map<string, string>(),
  tokenCounter: 0,
  hashPassword: vi.fn(),
  isPasswordStrongEnough: vi.fn(),
  verifyPassword: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  logAudit: vi.fn(),
  isMailConfigured: vi.fn(),
  sendClientMail: vi.fn(),
}));

vi.mock("./mariaDbQuery", () => ({ query: mocks.query }));
vi.mock("../db/pool", () => ({
  withTransaction: mocks.withTransaction,
}));
vi.mock("../utils/password", () => ({
  hashPassword: mocks.hashPassword,
  isPasswordStrongEnough: mocks.isPasswordStrongEnough,
  verifyPassword: mocks.verifyPassword,
}));
vi.mock("../utils/jwt", () => ({
  signAccessToken: mocks.signAccessToken,
  signRefreshToken: mocks.signRefreshToken,
  verifyAccessToken: mocks.verifyAccessToken,
  verifyRefreshToken: mocks.verifyRefreshToken,
}));
vi.mock("../utils/audit", () => ({ logAudit: mocks.logAudit }));
vi.mock("../services/mail/mailer", () => ({ isMailConfigured: mocks.isMailConfigured }));
vi.mock("../services/mail/clientMail", () => ({ sendClientMail: mocks.sendClientMail }));

import { requireAuth } from "../middleware/auth";
import { errorHandler } from "../middleware/errorHandler";
import { authRouter } from "./auth.routes";

const user = { id: "user-test-id", sub: "user-test-id", email: "smoke@example.invalid" };

describe("auth routes with mocked persistence", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.sessions.clear();
    mocks.tokenCounter = 0;
    mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("SELECT s.id FROM user_sessions")) {
        const [session] = [...mocks.sessions.entries()].find(([, hash]) => hash === params[1]) ?? [];
        return { rows: session ? [{ id: session }] : [], rowCount: session ? 1 : 0, insertId: 0 };
      }
      if (sql.includes("INSERT INTO user_sessions")) {
        mocks.sessions.set(String(params[0]), String(params[2]));
      } else if (sql.includes("UPDATE user_sessions")) {
        if (sql.includes("refresh_token_hash")) {
          for (const [id, hash] of mocks.sessions) {
            if (hash === params[0]) mocks.sessions.delete(id);
          }
        } else {
          mocks.sessions.delete(String(params[0]));
        }
      }
      return { rows: [], rowCount: 1, insertId: 0 };
    });
    mocks.withTransaction.mockImplementation((fn: (client: { query: typeof mocks.query }) => Promise<unknown>) =>
      fn({ query: mocks.query })
    );
    mocks.hashPassword.mockResolvedValue("hashed-test-password");
    mocks.isPasswordStrongEnough.mockReturnValue(true);
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.signAccessToken.mockReturnValue("test-access-token");
    mocks.signRefreshToken.mockImplementation(() => `test-refresh-token-${++mocks.tokenCounter}`);
    mocks.verifyAccessToken.mockImplementation((token: string) => {
      if (token !== "test-access-token") throw new Error("invalid token");
      return user;
    });
    mocks.verifyRefreshToken.mockImplementation(() => {
      throw new Error("invalid token");
    });
    mocks.logAudit.mockResolvedValue(undefined);

    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api/auth", authRouter());
    app.use(errorHandler);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  it("registers valid input using mocked writes and issues session cookies", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: "Test",
        lastName: "User",
        email: "smoke@example.invalid",
        password: "SafeTestPassword123",
        confirmPassword: "SafeTestPassword123",
      }),
    });
    const cookies = response.headers.getSetCookie();

    expect(response.status).toBe(201);
    expect(mocks.query).toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO kyc_profiles"), expect.anything());
    expect(mocks.query).not.toHaveBeenCalledWith(expect.stringContaining("trading_accounts"), expect.anything());
    expect(cookies.some((cookie) => cookie.startsWith("vx_access="))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith("vx_refresh=") && cookie.includes("Path=/api/auth"))).toBe(true);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("rejects invalid registration without attempting writes", async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("logs in valid credentials and rejects unknown credentials", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [{
        id: user.id,
        email: user.email,
        password_hash: "stored-hash",
        is_active: 1,
        is_suspended: 0,
        failed_login_count: 0,
        locked_until: null,
      }],
      rowCount: 1,
      insertId: 0,
    });
    const success = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "SafeTestPassword123" }),
    });
    expect(success.status).toBe(200);
    expect(success.headers.getSetCookie().some((cookie) => cookie.startsWith("vx_access="))).toBe(true);

    mocks.query.mockResolvedValueOnce({ rows: [], rowCount: 0, insertId: 0 });
    const failure = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "missing@example.invalid", password: "wrong" }),
    });
    expect(failure.status).toBe(401);
  });

  it("handles missing, invalid, expired, and valid refresh tokens", async () => {
    const missing = await fetch(`${baseUrl}/api/auth/refresh`, { method: "POST" });
    expect(missing.status).toBe(401);

    const invalid = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { cookie: "vx_refresh=invalid-test-token" },
    });
    expect(invalid.status).toBe(401);

    mocks.verifyRefreshToken.mockImplementationOnce(() => {
      throw new Error("expired token");
    });
    const expired = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { cookie: "vx_refresh=expired-test-token" },
    });
    expect(expired.status).toBe(401);

    const originalToken = "valid-test-token";
    mocks.sessions.set(
      "existing-session",
      createHash("sha256").update(originalToken).digest("hex")
    );
    mocks.verifyRefreshToken.mockReturnValueOnce(user);
    const valid = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { cookie: `vx_refresh=${originalToken}` },
    });
    expect(valid.status).toBe(200);
    const rotatedCookie = valid.headers.getSetCookie().find((cookie) => cookie.startsWith("vx_refresh="));
    expect(rotatedCookie).toBeDefined();
    expect(rotatedCookie).not.toContain(originalToken);

    mocks.verifyRefreshToken.mockReturnValueOnce(user);
    const replay = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { cookie: `vx_refresh=${originalToken}` },
    });
    expect(replay.status).toBe(401);
  });

  it("requires authentication for /me and accepts a valid access cookie", async () => {
    const anonymous = await fetch(`${baseUrl}/api/auth/me`);
    expect(anonymous.status).toBe(401);

    mocks.query.mockResolvedValueOnce({
      rows: [{ id: user.id, first_name: "Test", last_name: "User", email: user.email }],
      rowCount: 1,
      insertId: 0,
    });
    const authenticated = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: "vx_access=test-access-token" },
    });
    expect(authenticated.status).toBe(200);
    const responseBody = (await authenticated.json()) as { email: string };
    expect(responseBody.email).toBe(user.email);
  });

  it("expires refresh cookies on their original path at logout", async () => {
    const token = "logout-test-token";
    const hash = createHash("sha256").update(token).digest("hex");
    mocks.sessions.set("logout-session", hash);
    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { cookie: `vx_refresh=${token}` },
    });
    const refreshCookie = response.headers.getSetCookie().find((cookie) => cookie.startsWith("vx_refresh="));

    expect(response.status).toBe(200);
    expect(refreshCookie).toContain("Path=/api/auth");
    expect(refreshCookie).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
    expect(mocks.sessions.has("logout-session")).toBe(false);
  });

  it("says so when email isn't set up, without creating a reset link", async () => {
    mocks.isMailConfigured.mockReturnValue(false);
    const response = await post("/api/auth/forgot-password", { email: user.email });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, emailAvailable: false });
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.sendClientMail).not.toHaveBeenCalled();
  });

  it("emails a one-time reset link and stores only its hash", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.isMailConfigured.mockReturnValue(true);
    mocks.sendClientMail.mockResolvedValue({ sent: true, messageId: "m1" });
    const inserted: unknown[][] = [];
    mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
      if (sql.includes("FROM users WHERE email")) return { rows: [{ id: user.id, first_name: "Sam", email: user.email }] };
      if (sql.includes("COUNT(*) AS n")) return { rows: [{ n: 0 }] };
      if (sql.includes("INSERT INTO password_reset_tokens")) inserted.push(params);
      return { rows: [], rowCount: 1, insertId: 0 };
    });

    const response = await post("/api/auth/forgot-password", { email: user.email });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, emailAvailable: true });

    const mail = mocks.sendClientMail.mock.calls[0][0];
    expect(mail.to).toBe(user.email);
    const token = /reset-password\?token=([\w-]+)/.exec(mail.text)?.[1];
    expect(token).toBeTruthy();
    expect(inserted[0][1]).toBe(createHash("sha256").update(token!).digest("hex"));
    expect(JSON.stringify(inserted)).not.toContain(token);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("answers the same for an unknown email and sends nothing", async () => {
    mocks.isMailConfigured.mockReturnValue(true);
    mocks.query.mockResolvedValue({ rows: [] });
    const response = await post("/api/auth/forgot-password", { email: "nobody@example.invalid" });
    expect(await response.json()).toEqual({ ok: true, emailAvailable: true });
    expect(mocks.sendClientMail).not.toHaveBeenCalled();
  });

  it("stops sending reset links after three in an hour", async () => {
    mocks.isMailConfigured.mockReturnValue(true);
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM users WHERE email")) return { rows: [{ id: user.id, first_name: "Sam", email: user.email }] };
      if (sql.includes("COUNT(*) AS n")) return { rows: [{ n: 3 }] };
      return { rows: [] };
    });
    await post("/api/auth/forgot-password", { email: user.email });
    expect(mocks.sendClientMail).not.toHaveBeenCalled();
  });

  it("resets the password with a valid link and signs out every session", async () => {
    const statements: string[] = [];
    mocks.query.mockImplementation(async (sql: string) => {
      statements.push(sql);
      if (sql.includes("FROM password_reset_tokens")) return { rows: [{ id: "t1", user_id: user.id }] };
      return { rows: [], rowCount: 1 };
    });
    const response = await post("/api/auth/reset-password", { token: "a".repeat(43), password: "NewPassword123" });
    expect(response.status).toBe(200);
    expect(statements.some((q) => q.includes("UPDATE users SET password_hash"))).toBe(true);
    expect(statements.some((q) => q.includes("UPDATE user_sessions SET revoked_at"))).toBe(true);
    expect(statements.some((q) => q.includes("UPDATE password_reset_tokens SET used_at"))).toBe(true);
  });

  it("refuses an expired or used reset link", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    const response = await post("/api/auth/reset-password", { token: "b".repeat(43), password: "NewPassword123" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("expired or was already used");
  });

  function post(path: string, body: unknown) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }
});
