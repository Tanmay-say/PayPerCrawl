import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { depositSchema } from "../schemas/balance.js";

export const balanceRouter = Router();

balanceRouter.use(requireAuth);

balanceRouter.get("/", (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 1" });
});

balanceRouter.post("/deposit", validate(depositSchema), (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 1" });
});
