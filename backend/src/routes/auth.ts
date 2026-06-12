import { randomBytes } from "node:crypto";
import { Router } from "express";
import { verifyMessage } from "viem";
import { prisma } from "../lib/prisma.js";
import { clearAuthCookie, setAuthCookie, signToken } from "../lib/jwt.js";
import { validate } from "../middleware/validate.js";
import { rateLimitAuth } from "../middleware/rate-limit.js";
import { AppError } from "../middleware/error-handler.js";
import { siweNonceSchema, siweVerifySchema } from "../schemas/auth.js";

const NONCE_TTL_MS = 5 * 60 * 1000;

export const authRouter = Router();

/** SIWE-style: client requests a nonce bound to a wallet. */
authRouter.post(
  "/siwe/nonce",
  rateLimitAuth,
  validate(siweNonceSchema),
  async (req, res, next) => {
    try {
      const { walletAddress } = req.body as { walletAddress: string };
      const value = randomBytes(16).toString("hex");
      await prisma.siweNonce.create({
        data: {
          value,
          walletAddress: walletAddress.toLowerCase(),
          expiresAt: new Date(Date.now() + NONCE_TTL_MS),
        },
      });
      res.json({ nonce: value });
    } catch (err) {
      next(err);
    }
  },
);

/** Verify the signed SIWE message and issue a session cookie. */
authRouter.post(
  "/siwe/verify",
  rateLimitAuth,
  validate(siweVerifySchema),
  async (req, res, next) => {
    try {
      const { walletAddress, signature, message, email } = req.body as {
        walletAddress: string;
        signature: string;
        message: string;
        email?: string;
      };
      const normalized = walletAddress.toLowerCase();

      // Message must contain a fresh nonce we issued
      const nonceRow = await prisma.siweNonce.findFirst({
        where: {
          walletAddress: normalized,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: "desc" },
      });
      if (!nonceRow || !message.includes(nonceRow.value)) {
        throw new AppError(401, "No valid nonce", "invalid_nonce");
      }

      const valid = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      if (!valid) {
        throw new AppError(401, "Invalid signature", "invalid_signature");
      }

      await prisma.siweNonce.update({
        where: { value: nonceRow.value },
        data: { used: true },
      });

      const user = await prisma.user.upsert({
        where: { walletAddress: normalized },
        create: { walletAddress: normalized, ...(email ? { email } : {}) },
        update: email ? { email } : {},
      });

      const token = signToken({ sub: user.id, walletAddress: normalized });
      setAuthCookie(res, token);
      res.json({
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
      });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});
