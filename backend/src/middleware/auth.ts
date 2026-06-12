import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error-handler.js";

/** JWT auth middleware — implementation: Step 1. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.userId) {
    next(new AppError(401, "Authentication required", "unauthorized"));
    return;
  }
  next();
}
