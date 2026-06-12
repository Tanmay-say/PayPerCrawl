import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { verifyConnections } from "./lib/connections.js";
import { connectRedis } from "./lib/redis.js";
import { connectDatabase } from "./lib/prisma.js";
import { apiRouter } from "./routes/index.js";
import { gatewayRouter } from "./routes/gateway.js";
import { errorHandler } from "./middleware/error-handler.js";
import { parseAuth } from "./middleware/jwt-auth.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(parseAuth);

app.use("/api", apiRouter);
app.use("/gateway", gatewayRouter);

app.use(errorHandler);

async function start() {
  await connectRedis();
  await connectDatabase();

  const connections = await verifyConnections();
  if (connections.errors?.length) {
    console.warn("Connection warnings:", connections.errors.join("; "));
  }

  app.listen(env.PORT, () => {
    console.log(`PayPerCrawl API listening on http://localhost:${env.PORT}`);
    console.log(
      `Database: ${connections.providers.database}` +
        (connections.providers.pooler ? " (pooler)" : "") +
        ` · Redis: ${connections.providers.redis}`,
    );
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
