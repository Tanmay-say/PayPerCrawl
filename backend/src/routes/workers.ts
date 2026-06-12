import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { registerWorkerSchema, stakeSchema } from "../schemas/workers.js";

export const workersRouter = Router();

workersRouter.post("/register", requireAuth, validate(registerWorkerSchema), (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 1" });
});

workersRouter.post("/:id/stake", requireAuth, validate(stakeSchema), (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 1" });
});

workersRouter.post("/:id/unstake", requireAuth, validate(stakeSchema), (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 3" });
});

workersRouter.get("/:id/earnings", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 1" });
});
