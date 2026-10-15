import { Router } from "express";
import { z } from "zod";
import { query } from "../mariaDbQuery";
import { verifyPassword } from "../../utils/password";
import { signAdminToken } from "../../utils/jwt";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../middleware/errorHandler";
import { authRateLimiter } from "../../middleware/rateLimit";
import { logAudit } from "../../utils/audit";
import { requireAdmin } from "../../middleware/rbac";

export function adminAuthRouter() {
  const router = Router();

  const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

  router.post(
    "/login",
    authRateLimiter,
    asyncHandler(async (req, res) => {
      const body = loginSchema.parse(req.body);
      const result = await query(
        `SELECT id, email, password_hash, role, is_active FROM admin_users WHERE email = ?`,
        [body.email]
      );
      const admin = result.rows[0];
      if (!admin || !admin.is_active) throw new ApiError(401, "Invalid admin credentials");

      const valid = await verifyPassword(body.password, admin.password_hash);
      if (!valid) throw new ApiError(401, "Invalid admin credentials");

      const token = signAdminToken({ sub: admin.id, email: admin.email, role: admin.role });
      await logAudit({ actorType: "admin", actorId: admin.id, action: "ADMIN_LOGIN", ipAddress: req.ip });

      const secure = process.env.NODE_ENV === "production";
      res.cookie("vx_admin", token, { httpOnly: true, secure, sameSite: "lax", maxAge: 8 * 60 * 60 * 1000 });
      res.json({ id: admin.id, email: admin.email, role: admin.role });
    })
  );

  router.get(
    "/me",
    requireAdmin,
    asyncHandler(async (req, res) => {
      res.json(req.admin);
    })
  );

  router.post("/logout", (_req, res) => {
    res.clearCookie("vx_admin");
    res.json({ ok: true });
  });

  return router;
}
