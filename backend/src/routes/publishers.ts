import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { registerPublisherSchema, updatePriceSchema } from "../schemas/publishers.js";

export const publishersRouter = Router();

publishersRouter.post("/", requireAuth, validate(registerPublisherSchema), (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 1" });
});

publishersRouter.post("/:id/verify-domain", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 1" });
});

publishersRouter.patch(
  "/:id/price",
  requireAuth,
  validate(updatePriceSchema),
  (_req, res) => {
    res.status(501).json({ error: "not_implemented", message: "Step 1" });
  },
);

publishersRouter.get("/:id/earnings", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 1" });
});

publishersRouter.post("/:id/withdraw", requireAuth, (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 1" });
});
