import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AuthTokenPayload } from "../types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      admin?: { id: string; email: string; role: string };
    }
  }
}

/** Requires a valid access token, in the Authorization header or the vx_access cookie. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = bearer ?? req.cookies?.vx_access;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

/** Attaches req.user if a valid token is present, but never rejects the request. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = bearer ?? req.cookies?.vx_access;
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      /* ignore — treated as anonymous */
    }
  }
  next();
}
