import { Router } from "express";
import { verifyConnections } from "../lib/connections.js";
import { authRouter } from "./auth.js";
import { sitesRouter } from "./sites.js";
import { gatewayRouter } from "./gateway.js";
import { deployment } from "../lib/chain.js";

export const apiRouter = Router();

apiRouter.get("/health", async (_req, res) => {
  const connections = await verifyConnections();
  const redisOk =
    connections.redis === "connected" || connections.redis === "disabled";
  const ok = connections.database === "connected" && redisOk;

  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    service: "paypercrawl-api",
    chain: {
      chainId: deployment.chainId,
      registry: deployment.registry,
      escrow: deployment.escrow,
      usdc: deployment.usdc,
      protocolFeeBps: deployment.protocolFeeBps,
    },
    ...connections,
  });
});

apiRouter.get("/me", (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({ id: req.userId, walletAddress: req.walletAddress });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/sites", sitesRouter);
apiRouter.use("/gateway", gatewayRouter);

export { gatewayRouter };
