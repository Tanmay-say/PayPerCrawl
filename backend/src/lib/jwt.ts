import jwt, { type SignOptions } from "jsonwebtoken";
import type { Response } from "express";
import { env } from "../config/env.js";

export const AUTH_COOKIE = "ppc_session";

export interface JwtPayload {
  sub: string;
  walletAddress: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function setAuthCookie(res: Response, token: string): void {
  const secure = env.NODE_ENV === "production";
  // In production the frontend (e.g. paypercrawl.vercel.app) and the API
  // (paypercrawlapp.vercel.app) live on different subdomains, so the cookie
  // must be `SameSite=None; Secure` to be sent on cross-site fetches with
  // `credentials: "include"`. Locally we keep `lax` over plain HTTP.
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: secure ? "none" : "lax",
    secure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
}
