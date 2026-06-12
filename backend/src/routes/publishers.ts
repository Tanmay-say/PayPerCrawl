import { randomBytes } from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/error-handler.js";
import { registerPublisherSchema, updatePriceSchema } from "../schemas/publishers.js";
import { prisma } from "../lib/prisma.js";
import { paramId } from "../lib/params.js";

export const publishersRouter = Router();

publishersRouter.post("/", requireAuth, validate(registerPublisherSchema), async (req, res, next) => {
  try {
    if (req.userRole !== "PUBLISHER") {
      throw new AppError(403, "Publisher role required", "forbidden");
    }

    const { domain, pricePerCrawl } = req.body as {
      domain: string;
      pricePerCrawl: string;
    };

    const existing = await prisma.publisher.findUnique({ where: { userId: req.userId! } });
    if (existing) {
      throw new AppError(409, "Publisher already registered", "already_registered");
    }

    const gateSecret = randomBytes(32).toString("hex");
    const publisher = await prisma.publisher.create({
      data: {
        userId: req.userId!,
        domain: domain.toLowerCase(),
        pricePerCrawl: BigInt(pricePerCrawl),
        gateSecret,
      },
    });

    res.status(201).json({
      id: publisher.id,
      domain: publisher.domain,
      pricePerCrawl: publisher.pricePerCrawl.toString(),
      gateSecret,
      gatewaySnippet: `<script src="https://paypercrawl.com/gateway.js" data-domain="${publisher.domain}"></script>`,
    });
  } catch (err) {
    next(err);
  }
});

publishersRouter.post("/:id/verify-domain", requireAuth, async (req, res, next) => {
  try {
    const publisher = await prisma.publisher.findUnique({ where: { id: paramId(req, "id") } });
    if (!publisher || publisher.userId !== req.userId) {
      throw new AppError(404, "Publisher not found", "not_found");
    }
    await prisma.publisher.update({
      where: { id: publisher.id },
      data: { domainVerified: true },
    });
    res.json({ domainVerified: true });
  } catch (err) {
    next(err);
  }
});

publishersRouter.patch(
  "/:id/price",
  requireAuth,
  validate(updatePriceSchema),
  async (req, res, next) => {
    try {
      const publisher = await prisma.publisher.findUnique({ where: { id: paramId(req, "id") } });
      if (!publisher || publisher.userId !== req.userId) {
        throw new AppError(404, "Publisher not found", "not_found");
      }
      const { pricePerCrawl } = req.body as { pricePerCrawl: string };
      const updated = await prisma.publisher.update({
        where: { id: publisher.id },
        data: { pricePerCrawl: BigInt(pricePerCrawl) },
      });
      res.json({ pricePerCrawl: updated.pricePerCrawl.toString() });
    } catch (err) {
      next(err);
    }
  },
);

publishersRouter.get("/:id/earnings", requireAuth, async (req, res, next) => {
  try {
    const publisher = await prisma.publisher.findUnique({ where: { id: paramId(req, "id") } });
    if (!publisher || publisher.userId !== req.userId) {
      throw new AppError(404, "Publisher not found", "not_found");
    }
    res.json({ earnings: publisher.earningsBalance.toString() });
  } catch (err) {
    next(err);
  }
});

publishersRouter.post("/:id/withdraw", requireAuth, async (_req, res) => {
  res.status(501).json({ error: "not_implemented", message: "Step 5 on-chain withdraw" });
});
