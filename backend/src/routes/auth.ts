import { randomBytes } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcrypt";
import { verifyMessage } from "viem";
import { prisma } from "../lib/prisma.js";
import { setAuthCookie, signToken } from "../lib/jwt.js";
import { validate } from "../middleware/validate.js";
import { rateLimitAuth } from "../middleware/rate-limit.js";
import { AppError } from "../middleware/error-handler.js";
import {
  agentNonceSchema,
  agentVerifySchema,
  loginSchema,
  registerSchema,
} from "../schemas/auth.js";
import { userAccountId } from "../config/constants.js";

const BCRYPT_ROUNDS = 12;
const NONCE_TTL_MS = 5 * 60 * 1000;

export const authRouter = Router();

function authUserResponse(user: { id: string; email: string | null; role: string }) {
  return { id: user.id, email: user.email, role: user.role };
}

authRouter.post(
  "/register",
  rateLimitAuth,
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const { email, password, role } = req.body as {
        email: string;
        password: string;
        role: "PUBLISHER" | "REQUESTER" | "WORKER";
      };

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new AppError(409, "Email already registered", "email_taken");
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email, passwordHash, role },
        });
        await tx.ledgerAccount.create({
          data: { id: userAccountId(created.id), balance: 0n },
        });
        return created;
      });

      const token = signToken({ sub: user.id, role: user.role });
      setAuthCookie(res, token);
      res.status(201).json(authUserResponse(user));
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post("/login", rateLimitAuth, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new AppError(401, "Invalid credentials", "invalid_credentials");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError(401, "Invalid credentials", "invalid_credentials");
    }

    const token = signToken({ sub: user.id, role: user.role });
    setAuthCookie(res, token);
    res.json(authUserResponse(user));
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  "/agent/nonce",
  rateLimitAuth,
  validate(agentNonceSchema),
  async (req, res, next) => {
    try {
      const { walletAddress } = req.body as { walletAddress: string };
      const value = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

      await prisma.nonce.create({
        data: { value, walletAddress: walletAddress.toLowerCase(), expiresAt },
      });

      res.json({ nonce: value });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  "/agent/verify",
  rateLimitAuth,
  validate(agentVerifySchema),
  async (req, res, next) => {
    try {
      const { walletAddress, signature } = req.body as {
        walletAddress: string;
        signature: string;
      };
      const normalized = walletAddress.toLowerCase();

      const nonceRow = await prisma.nonce.findFirst({
        where: {
          walletAddress: normalized,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { expiresAt: "desc" },
      });

      if (!nonceRow) {
        throw new AppError(401, "No valid nonce", "invalid_nonce");
      }

      const message = `Sign in to PayPerCrawl:\n${nonceRow.value}`;
      const valid = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      if (!valid) {
        throw new AppError(401, "Invalid signature", "invalid_signature");
      }

      await prisma.nonce.update({
        where: { value: nonceRow.value },
        data: { used: true },
      });

      let user = await prisma.user.findUnique({
        where: { walletAddress: normalized },
      });

      if (!user) {
        user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              walletAddress: normalized,
              role: "REQUESTER",
            },
          });
          await tx.ledgerAccount.create({
            data: { id: userAccountId(created.id), balance: 0n },
          });
          return created;
        });
      }

      const token = signToken({
        sub: user.id,
        role: user.role,
        walletAddress: normalized,
      });
      setAuthCookie(res, token);
      res.json(authUserResponse(user));
    } catch (err) {
      next(err);
    }
  },
);
