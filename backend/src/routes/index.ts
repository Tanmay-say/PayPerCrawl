import { Router } from "express";
import { verifyConnections } from "../lib/connections.js";
import { authRouter } from "./auth.js";
import { balanceRouter } from "./balance.js";
import { publishersRouter } from "./publishers.js";
import { workersRouter } from "./workers.js";
import { jobsRouter } from "./jobs.js";
import { disputesRouter } from "./disputes.js";
import { aiRouter } from "./ai.js";
export const apiRouter = Router();

apiRouter.get("/health", async (_req, res) => {
  const connections = await verifyConnections();
  const ok = connections.database === "connected" && connections.redis === "connected";

  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    service: "paypercrawl-api",
    ...connections,
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/balance", balanceRouter);
apiRouter.use("/publishers", publishersRouter);
apiRouter.use("/workers", workersRouter);
apiRouter.use("/jobs", jobsRouter);
apiRouter.use("/disputes", disputesRouter);
apiRouter.use("/ai", aiRouter);
