import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthTokenPayload } from "../types";

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessTtl as any });
}

export function signRefreshToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: `${env.jwtRefreshTtlDays}d`,
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AuthTokenPayload;
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as AuthTokenPayload;
}

export interface AdminTokenPayload {
  sub: string; // admin_users id
  email: string;
  role: string;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.jwtAdminSecret, { expiresIn: env.jwtAdminTtl as any });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, env.jwtAdminSecret) as AdminTokenPayload;
}
