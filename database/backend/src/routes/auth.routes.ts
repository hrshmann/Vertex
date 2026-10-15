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
import { isDuplicateKeyError } from "../utils/dbErrors";
import crypto from "node:crypto";

export function authRouter(demoEngine: DemoTradingEngine) {
  const router = Router();
  // The strict limiter guards password entry only; /me and /refresh run on every page load.

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
    authRateLimiter,
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
      // User, KYC profile and demo account are created together or not at all.
      try {
        await withTransaction(async (client) => {
          await client.query(
            `INSERT INTO users (id, first_name, last_name, email, mobile, country, password_hash)
             VALUES (?,?,?,?,?,?,?)`,
            [userId, body.firstName, body.lastName, body.email, body.mobile ?? null, body.country ?? null, passwordHash]
          );
          await client.query(`INSERT INTO kyc_profiles (user_id) VALUES (?)`, [userId]);
          await demoEngine.ensureDemoAccount(userId, client);
        });
      } catch (err) {
        // A concurrent registration with the same email won the race.
        if (isDuplicateKeyError(err)) throw new ApiError(409, "An account with this email already exists");
        throw err;
      }
      const user = { id: userId, email: body.email };

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
    authRateLimiter,
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
        // Suspended or deactivated users cannot renew their session.
        const session = await client.query<{ id: string }>(
          `SELECT s.id FROM user_sessions s JOIN users u ON u.id = s.user_id
           WHERE s.user_id = ? AND s.refresh_token_hash = ? AND s.revoked_at IS NULL
             AND s.expires_at > UTC_TIMESTAMP(6)
             AND u.is_active = TRUE AND u.is_suspended = FALSE
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
    authRateLimiter,
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

  const profileSchema = z.object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    mobile: z.string().trim().min(5).max(32).nullable().optional(),
    country: z.string().length(2).toUpperCase().nullable().optional(),
  });

  router.patch(
    "/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      const body = profileSchema.parse(req.body);
      await query(
        `UPDATE users SET
           first_name = COALESCE(?, first_name),
           last_name = COALESCE(?, last_name),
           mobile = IF(?, ?, mobile),
           country = IF(?, ?, country),
           updated_at = now()
         WHERE id = ?`,
        [
          body.firstName ?? null,
          body.lastName ?? null,
          body.mobile !== undefined ? 1 : 0,
          body.mobile ?? null,
          body.country !== undefined ? 1 : 0,
          body.country ?? null,
          req.user!.sub,
        ]
      );
      await logAudit({ actorType: "user", actorId: req.user!.sub, action: "PROFILE_UPDATED", ipAddress: req.ip });
      const result = await query(
        `SELECT id, first_name, last_name, email, mobile, country, email_verified_at, created_at FROM users WHERE id = ?`,
        [req.user!.sub]
      );
      res.json(result.rows[0]);
    })
  );

  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10),
  });

  router.post(
    "/change-password",
    requireAuth,
    authRateLimiter,
    asyncHandler(async (req, res) => {
      const body = changePasswordSchema.parse(req.body);
      const result = await query(`SELECT id, email, password_hash FROM users WHERE id = ?`, [req.user!.sub]);
      const user = result.rows[0];
      if (!user) throw new ApiError(404, "User not found");
      if (!(await verifyPassword(body.currentPassword, user.password_hash))) {
        throw new ApiError(400, "Your current password is incorrect.");
      }
      if (!isPasswordStrongEnough(body.newPassword)) {
        throw new ApiError(400, "Use at least 10 characters, with upper and lower case letters and a number.");
      }
      if (await verifyPassword(body.newPassword, user.password_hash)) {
        throw new ApiError(400, "Choose a password you haven't used for this account.");
      }

      await query(`UPDATE users SET password_hash = ?, updated_at = now() WHERE id = ?`, [
        await hashPassword(body.newPassword),
        user.id,
      ]);
      // Sign out every other device; this one gets a fresh session below.
      await query(`UPDATE user_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND revoked_at IS NULL`, [user.id]);
      await logAudit({ actorType: "user", actorId: user.id, action: "PASSWORD_CHANGED", ipAddress: req.ip });
      await query(
        `INSERT INTO notifications (user_id, type, title, body) VALUES (?,'SECURITY_ALERT','Password changed',?)`,
        [user.id, "Your password was changed and your other devices were signed out. If this wasn't you, contact support."]
      );

      await issueSessionCookies(res, user.id, user.email);
      res.json({ ok: true });
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
