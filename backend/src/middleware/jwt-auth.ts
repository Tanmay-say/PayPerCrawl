import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE, verifyToken } from "../lib/jwt.js";

/** Parses JWT from httpOnly cookie when present; never rejects requests. */
export function parseAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.walletAddress = payload.walletAddress;
  } catch {
    /* anonymous */
  }
  next();
}
