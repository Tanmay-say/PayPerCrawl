import type { NextFunction, Request, Response } from "express";
import { redis, isRedisDisabled } from "../lib/redis.js";

const WINDOW_SEC = 15 * 60;
const MAX_ATTEMPTS = 10;

export function rateLimitAuth(req: Request, res: Response, next: NextFunction): void {
  if (!redis || isRedisDisabled()) {
    next();
    return;
  }
  const ip = req.ip ?? "unknown";
  const key = `ratelimit:auth:${ip}`;

  redis
    .multi()
    .incr(key)
    .expire(key, WINDOW_SEC, "NX")
    .exec()
    .then((results: [error: Error | null, result: unknown][] | null) => {
      const count = Number(results?.[0]?.[1] ?? 0);
      if (count > MAX_ATTEMPTS) {
        res.status(429).json({ error: "rate_limit_exceeded", message: "Too many attempts" });
        return;
      }
      next();
    })
    .catch(() => next());
}
