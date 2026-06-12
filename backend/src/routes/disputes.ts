import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

export const disputesRouter = Router();

disputesRouter.get("/:id", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 3" });
});
