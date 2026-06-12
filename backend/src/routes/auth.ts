import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { rateLimitAuth } from "../middleware/rate-limit.js";
import {
  agentNonceSchema,
  agentVerifySchema,
  loginSchema,
  registerSchema,
} from "../schemas/auth.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  rateLimitAuth,
  validate(registerSchema),
  (_req, res) => {
    res.status(501).json({ error: "not_implemented", message: "Step 1" });
  },
);

authRouter.post("/login", rateLimitAuth, validate(loginSchema), (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 1" });
});

authRouter.post(
  "/agent/nonce",
  rateLimitAuth,
  validate(agentNonceSchema),
  (_req, res) => {
    res.status(501).json({ error: "not_implemented", message: "Step 1" });
  },
);

authRouter.post(
  "/agent/verify",
  rateLimitAuth,
  validate(agentVerifySchema),
  (_req, res) => {
    res.status(501).json({ error: "not_implemented", message: "Step 1" });
  },
);
