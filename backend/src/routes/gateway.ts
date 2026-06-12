import { Router } from "express";

export const gatewayRouter = Router();

/** Publisher drop-in gateway edge — implementation: Step 4. */
gatewayRouter.get("/check", (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 4" });
});
