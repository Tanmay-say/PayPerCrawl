import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

export const aiRouter = Router();

aiRouter.post("/risk-score", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 5" });
});

aiRouter.post("/suggest-price", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 5" });
});

aiRouter.get("/anomalies", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 5" });
});
