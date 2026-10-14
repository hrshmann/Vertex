import { NextFunction, Request, Response } from "express";
import { verifyAdminToken } from "../utils/jwt";

/** Requires a valid admin session token (separate secret/namespace from user tokens). */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = bearer ?? req.cookies?.vx_admin;
  if (!token) return res.status(401).json({ error: "Admin authentication required" });
  try {
    const payload = verifyAdminToken(token);
    req.admin = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin session" });
  }
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
