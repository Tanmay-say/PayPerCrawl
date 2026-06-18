import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { gatewayRouter } from "./routes/gateway.js";
import { errorHandler } from "./middleware/error-handler.js";
import { parseAuth } from "./middleware/jwt-auth.js";

/**
 * Build the Express app. No side effects (no listen, no DB connect),
 * so it can be reused by both the Node entry (src/index.ts) and the
 * Vercel serverless handler (api/[[...path]].ts).
 *
 * Pass an array of allowed origins (defaults to env.CORS_ORIGIN +
 * env.CORS_ORIGINS extra list) for cross-domain cookies.
 */
export function createApp(): express.Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());

  // Comma-separated list in CORS_ORIGINS extends the single CORS_ORIGIN value.
  const extraOrigins = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = new Set<string>([env.CORS_ORIGIN, ...extraOrigins]);

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.has(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(parseAuth);

  app.use("/gateway", gatewayRouter);
  app.use("/api", apiRouter);

  app.use(errorHandler);

  return app;
}
