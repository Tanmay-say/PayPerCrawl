import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createJobSchema, submitResultSchema } from "../schemas/jobs.js";

export const jobsRouter = Router();

jobsRouter.get("/available", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 2" });
});

jobsRouter.post("/", requireAuth, validate(createJobSchema), (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 2" });
});

jobsRouter.get("/:id", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 2" });
});

jobsRouter.get("/:id/receipt", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 2" });
});

jobsRouter.post("/:id/claim", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 2" });
});

jobsRouter.post(
  "/:id/result",
  requireAuth,
  validate(submitResultSchema),
  (_req, res) => {
    res.status(501).json({ error: "not_implemented", message: "Step 2" });
  },
);

jobsRouter.post("/:id/dispute", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 3" });
});
