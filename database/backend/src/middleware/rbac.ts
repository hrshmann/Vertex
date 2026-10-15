import { NextFunction, Request, Response } from "express";
import { verifyAdminToken } from "../utils/jwt";
import { pool } from "../db/pool";

/**
 * Requires a valid admin session token (separate secret/namespace from user tokens). The admin
 * row is re-read on every request so deactivation and role changes take effect immediately,
 * rather than when the token expires.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = bearer ?? req.cookies?.vx_admin;
  if (!token) return res.status(401).json({ error: "Admin authentication required" });
  let adminId: string;
  try {
    adminId = verifyAdminToken(token).sub;
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin session" });
  }

  pool
    .query<{ email: string; role: string; is_active: number }>(
      "SELECT email, role, is_active FROM admin_users WHERE id = ?",
      [adminId]
    )
    .then((result) => {
      const admin = result.rows[0];
      if (!admin || !admin.is_active) {
        res.status(401).json({ error: "Invalid or expired admin session" });
        return;
      }
      req.admin = { id: adminId, email: admin.email, role: admin.role };
      next();
    })
    .catch(next);
}

/** Restricts a route to one or more admin roles. Call after requireAdmin. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) return res.status(401).json({ error: "Admin authentication required" });
    if (!roles.includes(req.admin.role) && req.admin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Insufficient admin role for this action" });
    }
    next();
  };
}
