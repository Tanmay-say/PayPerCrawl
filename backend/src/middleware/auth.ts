import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error-handler.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      walletAddress?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId || !req.walletAddress) {
    next(new AppError(401, "Authentication required", "unauthorized"));
    return;
  }
  next();
}
