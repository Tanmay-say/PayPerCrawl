import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/error-handler.js";
import {
  registerSiteSchema,
  updatePriceSchema,
} from "../schemas/sites.js";
import {
  chainName,
  computeSiteIdLocal,
  deployment,
  readSiteOnchain,
} from "../lib/chain.js";

export const sitesRouter = Router();

sitesRouter.use(requireAuth);

sitesRouter.get("/", async (req, res, next) => {
  try {
    const sites = await prisma.site.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { events: true } },
      },
    });
    res.json(
      sites.map((s) => ({
        id: s.id,
        onchainId: s.onchainId,
        domain: s.domain,
        priceMicros: s.priceMicros.toString(),
        active: s.active,
        createdAt: s.createdAt,
        crawlCount: s._count.events,
      })),
    );
  } catch (err) {
    next(err);
  }
});

sitesRouter.post("/", validate(registerSiteSchema), async (req, res, next) => {
  try {
    const { onchainId, domain, priceMicros, txHash } = req.body as {
      onchainId: `0x${string}`;
      domain: string;
      priceMicros: string;
      txHash: `0x${string}`;
    };

    const normalizedDomain = domain.toLowerCase();

    // Re-derive expected siteId and confirm caller is the on-chain owner
    const expectedId = computeSiteIdLocal(
      req.walletAddress! as `0x${string}`,
      normalizedDomain,
    );
    if (expectedId.toLowerCase() !== onchainId.toLowerCase()) {
      throw new AppError(400, "Site id does not match wallet+domain", "site_id_mismatch");
    }

    const onchain = await readSiteOnchain(onchainId);
    if (
      onchain.publisher.toLowerCase() !== req.walletAddress!.toLowerCase() ||
      onchain.priceMicros.toString() !== priceMicros ||
      !onchain.active
    ) {
      throw new AppError(
        400,
        "On-chain site state does not match (run registerSite tx first)",
        "onchain_mismatch",
      );
    }

    const existing = await prisma.site.findFirst({
      where: { OR: [{ onchainId }, { domain: normalizedDomain }] },
    });
    if (existing) {
      throw new AppError(409, "Site already registered", "already_registered");
    }

    const site = await prisma.site.create({
      data: {
        onchainId,
        userId: req.userId!,
        domain: normalizedDomain,
        priceMicros: BigInt(priceMicros),
        active: true,
      },
    });

    res.status(201).json({
      id: site.id,
      onchainId: site.onchainId,
      domain: site.domain,
      priceMicros: site.priceMicros.toString(),
      active: site.active,
      txHash,
    });
  } catch (err) {
    next(err);
  }
});

sitesRouter.get("/:id", async (req, res, next) => {
  try {
    const site = await prisma.site.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!site) throw new AppError(404, "Site not found", "not_found");

    const earningsAgg = await prisma.crawlEvent.aggregate({
      where: { siteId: site.id },
      _sum: { publisherCut: true, protocolCut: true, amountMicros: true },
      _count: true,
    });

    res.json({
      id: site.id,
      onchainId: site.onchainId,
      domain: site.domain,
      priceMicros: site.priceMicros.toString(),
      active: site.active,
      createdAt: site.createdAt,
      crawlCount: earningsAgg._count,
      totalEarnedMicros: (earningsAgg._sum.publisherCut ?? 0n).toString(),
      contracts: {
        registry: deployment.registry,
        escrow: deployment.escrow,
        usdc: deployment.usdc,
        chainId: deployment.chainId,
        protocolFeeBps: deployment.protocolFeeBps,
      },
    });
  } catch (err) {
    next(err);
  }
});

sitesRouter.patch("/:id/price", validate(updatePriceSchema), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const site = await prisma.site.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!site) throw new AppError(404, "Site not found", "not_found");

    const { priceMicros } = req.body as { priceMicros: string };

    // Confirm on-chain price was already updated
    const onchain = await readSiteOnchain(site.onchainId as `0x${string}`);
    if (onchain.priceMicros.toString() !== priceMicros) {
      throw new AppError(
        400,
        "Update on-chain first via registry.updatePrice",
        "onchain_mismatch",
      );
    }

    const updated = await prisma.site.update({
      where: { id: site.id },
      data: { priceMicros: BigInt(priceMicros) },
    });
    res.json({
      id: updated.id,
      priceMicros: updated.priceMicros.toString(),
    });
  } catch (err) {
    next(err);
  }
});

sitesRouter.get("/:id/events", async (req, res, next) => {
  try {
    const site = await prisma.site.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!site) throw new AppError(404, "Site not found", "not_found");

    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const events = await prisma.crawlEvent.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json(
      events.map((e) => ({
        id: e.id,
        agentAddress: e.agentAddress,
        amountMicros: e.amountMicros.toString(),
        publisherCut: e.publisherCut.toString(),
        protocolCut: e.protocolCut.toString(),
        txHash: e.txHash,
        nonce: e.nonce,
        userAgent: e.userAgent,
        path: e.path,
        createdAt: e.createdAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});

sitesRouter.get("/:id/snippet", async (req, res, next) => {
  try {
    const site = await prisma.site.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!site) throw new AppError(404, "Site not found", "not_found");

    const apiBase = `${req.protocol}://${req.get("host")}`;
    const chain = chainName();
    res.json({
      siteId: site.onchainId,
      domain: site.domain,
      priceMicros: site.priceMicros.toString(),
      apiBase,
      escrow: deployment.escrow,
      registry: deployment.registry,
      usdc: deployment.usdc,
      chainId: deployment.chainId,
      chain,
      metaTag: [
        `<meta name="ppc-site-id" content="${site.onchainId}">`,
        `<meta name="ppc-price-micros" content="${site.priceMicros.toString()}">`,
        `<meta name="ppc-escrow" content="${deployment.escrow}">`,
        `<meta name="ppc-chain" content="${chain}">`,
      ].join("\n"),
    });
  } catch (err) {
    next(err);
  }
});
