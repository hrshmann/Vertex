import { Router } from "express";
import { z } from "zod";
import { hashPassword, isPasswordStrongEnough, verifyPassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../middleware/errorHandler";
import { authRateLimiter } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../utils/audit";
import { DemoTradingEngine } from "../services/trading/demoEngine";
import { query } from "./mariaDbQuery";
import { DbConnection, withTransaction } from "../db/pool";
import { env } from "../config/env";
import crypto from "node:crypto";

export function authRouter(demoEngine: DemoTradingEngine) {
  const router = Router();
  router.use(authRateLimiter);

  const registerSchema = z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    mobile: z.string().min(5).max(32).optional(),
    country: z.string().length(2).optional(),
    password: z.string().min(10),
    confirmPassword: z.string(),
  });

  router.post(
    "/register",
    asyncHandler(async (req, res) => {
      const body = registerSchema.parse(req.body);
      if (body.password !== body.confirmPassword) {
        throw new ApiError(400, "Passwords do not match");
      }
      if (!isPasswordStrongEnough(body.password)) {
        throw new ApiError(
          400,
          "Password must be at least 10 characters and include upper, lower case letters and a number"
        );
      }

      const existing = await query("SELECT id FROM users WHERE email = ?", [body.email]);
      if (existing.rows[0]) {
        throw new ApiError(409, "An account with this email already exists");
      }

      const passwordHash = await hashPassword(body.password);
      const userId = crypto.randomUUID();
      await query(
        `INSERT INTO users (id, first_name, last_name, email, mobile, country, password_hash)
         VALUES (?,?,?,?,?,?,?)`,
        [userId, body.firstName, body.lastName, body.email, body.mobile ?? null, body.country ?? null, passwordHash]
      );
      const user = { id: userId, email: body.email };

      await query(`INSERT INTO kyc_profiles (user_id) VALUES (?)`, [user.id]);
      await demoEngine.ensureDemoAccount(user.id);

      await logAudit({ actorType: "user", actorId: user.id, action: "REGISTERED", ipAddress: req.ip });

      await issueSessionCookies(res, user.id, user.email);
      res.status(201).json({ id: user.id, email: user.email });
    })
  );

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const body = loginSchema.parse(req.body);
      const result = await query(
        `SELECT id, email, password_hash, is_active, is_suspended, failed_login_count, locked_until
         FROM users WHERE email = ?`,
        [body.email]
      );
      const user = result.rows[0];

      // Constant-shape response whether or not the account exists, to avoid user enumeration.
      const genericError = () => new ApiError(401, "Invalid email or password");
      if (!user) throw genericError();

      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new ApiError(423, "Account temporarily locked due to repeated failed logins");
      }
      if (user.is_suspended) throw new ApiError(403, "Account suspended. Contact support.");
      if (!user.is_active) throw genericError();

      const valid = await verifyPassword(body.password, user.password_hash);
      if (!valid) {
        const failedCount = user.failed_login_count + 1;
        const lockedUntil = failedCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await query(
          `UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?`,
          [failedCount, lockedUntil, user.id]
        );
        throw genericError();
      }

      await query(
        `UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?`,
        [user.id]
      );
      await logAudit({ actorType: "user", actorId: user.id, action: "LOGIN", ipAddress: req.ip });

      await issueSessionCookies(res, user.id, user.email);
      res.json({ id: user.id, email: user.email });
    })
  );

  router.post(
    "/refresh",
    asyncHandler(async (req, res) => {
      const token = req.cookies?.vx_refresh;
      if (!token) throw new ApiError(401, "No refresh token");
      let payload;
      try {
        payload = verifyRefreshToken(token);
      } catch {
        throw new ApiError(401, "Invalid or expired refresh token");
      }

      const accessToken = signAccessToken({ sub: payload.sub, email: payload.email });
      const refreshToken = signRefreshToken({ sub: payload.sub, email: payload.email });
      const currentHash = hashRefreshToken(token);
      const nextHash = hashRefreshToken(refreshToken);
      const rotated = await withTransaction(async (client) => {
        const session = await client.query<{ id: string }>(
          `SELECT id FROM user_sessions
           WHERE user_id = ? AND refresh_token_hash = ? AND revoked_at IS NULL
             AND expires_at > UTC_TIMESTAMP(6)
           FOR UPDATE`,
          [payload.sub, currentHash]
        );
        if (!session.rows[0]) return false;

        await client.query(
          `UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP(6)
           WHERE id = ? AND revoked_at IS NULL`,
          [session.rows[0].id]
        );
        await insertRefreshSession(client, payload.sub, nextHash);
        return true;
      });
      if (!rotated) throw new ApiError(401, "Invalid or expired refresh token");

      setSessionCookies(res, accessToken, refreshToken);
      res.json({ ok: true });
    })
  );

  router.post(
    "/logout",
    asyncHandler(async (req, res) => {
      const refreshToken = req.cookies?.vx_refresh;
      if (refreshToken) {
        await query(
          `UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP(6)
           WHERE refresh_token_hash = ? AND revoked_at IS NULL`,
          [hashRefreshToken(refreshToken)]
        );
      }
      res.clearCookie("vx_access");
      res.clearCookie("vx_refresh", { path: "/api/auth" });
      res.json({ ok: true });
    })
  );

  router.get(
    "/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await query(
        `SELECT id, first_name, last_name, email, mobile, country, email_verified_at, created_at
         FROM users WHERE id = ?`,
        [req.user!.sub]
      );
      if (!result.rows[0]) throw new ApiError(404, "User not found");
      res.json(result.rows[0]);
    })
  );

  const forgotSchema = z.object({ email: z.string().email() });
  router.post(
    "/forgot-password",
    asyncHandler(async (req, res) => {
      const { email } = forgotSchema.parse(req.body);
      const result = await query("SELECT id FROM users WHERE email = ?", [email]);
      if (result.rows[0]) {
        await logAudit({ actorType: "user", actorId: result.rows[0].id, action: "PASSWORD_RESET_REQUESTED" });
      }
      // Always respond the same way, regardless of whether the email exists.
      res.json({
        ok: true,
        message: "If that email exists, password reset instructions are unavailable until email delivery is configured.",
      });
    })
  );

  return router;
}

async function issueSessionCookies(res: import("express").Response, userId: string, email: string) {
  const access = signAccessToken({ sub: userId, email });
  const refresh = signRefreshToken({ sub: userId, email });
  await insertRefreshSession({ query }, userId, hashRefreshToken(refresh));
  setSessionCookies(res, access, refresh);
}

async function insertRefreshSession(
  client: Pick<DbConnection, "query">,
  userId: string,
  refreshTokenHash: string
) {
  const expiresAt = new Date(Date.now() + env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000);
  await client.query(
    `INSERT INTO user_sessions (id, user_id, refresh_token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [crypto.randomUUID(), userId, refreshTokenHash, expiresAt]
  );
}

function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function setSessionCookies(
  res: import("express").Response,
  access: string,
  refresh: string
) {
  const secure = process.env.NODE_ENV === "production";
  res.cookie("vx_access", access, { httpOnly: true, secure, sameSite: "lax", maxAge: 15 * 60 * 1000 });
  res.cookie("vx_refresh", refresh, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: env.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
}
