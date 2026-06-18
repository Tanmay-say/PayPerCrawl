import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { verifyConnections } from "./lib/connections.js";
import { connectRedis } from "./lib/redis.js";
import { connectDatabase } from "./lib/prisma.js";

async function start() {
  await connectRedis();
  await connectDatabase();

  const connections = await verifyConnections();
  if (connections.errors?.length) {
    console.warn("Connection warnings:", connections.errors.join("; "));
  }

  const app = createApp();
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
