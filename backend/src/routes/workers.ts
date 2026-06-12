import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/error-handler.js";
import { registerWorkerSchema, stakeSchema } from "../schemas/workers.js";
import { prisma } from "../lib/prisma.js";
import { getSettlementEngine } from "../services/settlement/index.js";
import { paramId } from "../lib/params.js";

export const workersRouter = Router();

workersRouter.post("/register", requireAuth, validate(registerWorkerSchema), async (req, res, next) => {
  try {
    if (req.userRole !== "WORKER") {
      throw new AppError(403, "Worker role required", "forbidden");
    }

    const { capabilities, minFee } = req.body as {
      capabilities: string[];
      minFee: string;
    };

    const existing = await prisma.worker.findUnique({ where: { userId: req.userId! } });
    if (existing) {
      throw new AppError(409, "Worker already registered", "already_registered");
    }

    const worker = await prisma.worker.create({
      data: {
        userId: req.userId!,
        capabilities,
        minFee: BigInt(minFee),
      },
    });

    res.status(201).json({
      id: worker.id,
      capabilities: worker.capabilities,
      minFee: worker.minFee.toString(),
      stakeAmount: worker.stakeAmount.toString(),
    });
  } catch (err) {
    next(err);
  }
});

workersRouter.post("/:id/stake", requireAuth, validate(stakeSchema), async (req, res, next) => {
  try {
    const worker = await prisma.worker.findUnique({ where: { id: paramId(req, "id") } });
    if (!worker || worker.userId !== req.userId) {
      throw new AppError(404, "Worker not found", "not_found");
    }

    const amount = BigInt((req.body as { amount: string }).amount);
    await getSettlementEngine().stakeFromBalance(req.userId!, worker.id, amount);

    const updated = await prisma.worker.findUniqueOrThrow({ where: { id: worker.id } });
    res.json({ stakeAmount: updated.stakeAmount.toString() });
  } catch (err) {
    next(err);
  }
});

workersRouter.post("/:id/unstake", requireAuth, validate(stakeSchema), (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 3 unstake lock period" });
});

workersRouter.get("/:id/earnings", requireAuth, async (req, res, next) => {
  try {
    const worker = await prisma.worker.findUnique({ where: { id: paramId(req, "id") } });
    if (!worker || worker.userId !== req.userId) {
      throw new AppError(404, "Worker not found", "not_found");
    }
    res.json({ earnings: worker.earningsBalance.toString() });
  } catch (err) {
    next(err);
  }
});
