import { randomBytes } from "node:crypto";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../middleware/error-handler.js";
import { verifyCrawlSchema } from "../schemas/sites.js";
import { chainName, deployment, getCrawlReceipt } from "../lib/chain.js";

export const gatewayRouter = Router();

/**
 * GET /gateway/check?domain=...&path=...
 * Returns 402 + payment terms when the domain is registered.
 * Used by the Cloudflare Worker on every crawler request that lacks a receipt.
 */
gatewayRouter.get("/check", async (req, res, next) => {
  try {
    const domain = String(req.query.domain ?? "").toLowerCase();
    if (!domain) {
      throw new AppError(400, "domain required", "missing_domain");
    }
    const site = await prisma.site.findUnique({ where: { domain } });
    if (!site || !site.active) {
      // Tell the Worker this domain isn't gated — pass humans/bots straight through.
      res.status(404).json({ error: "site_not_registered" });
      return;
    }

    const nonce = `0x${randomBytes(32).toString("hex")}`;
    res
      .status(402)
      .set("X-PPC-Nonce", nonce)
      .json({
        status: "payment_required",
        siteId: site.onchainId,
        domain: site.domain,
        priceMicros: site.priceMicros.toString(),
        currency: "USDC",
        chain: chainName(),
        chainId: deployment.chainId,
        escrow: deployment.escrow,
        usdc: deployment.usdc,
        nonce,
        ttl: 60,
        message:
          "Pay via PayPerCrawlEscrow.payForCrawl(siteId, nonce, amount). Resubmit with X-PPC-Receipt header.",
      });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/gateway/verify
 * Worker calls this with the agent's tx hash; we read on-chain, store the
 * CrawlEvent, and return 200 so the Worker can serve the content.
 */
gatewayRouter.post("/verify", validate(verifyCrawlSchema), async (req, res, next) => {
  try {
    const { siteId, nonce, txHash, userAgent, path: reqPath } = req.body as {
      siteId: `0x${string}`;
      nonce: `0x${string}`;
      txHash: `0x${string}`;
      userAgent?: string;
      path?: string;
    };

    const site = await prisma.site.findUnique({ where: { onchainId: siteId } });
    if (!site || !site.active) {
      throw new AppError(404, "Site not registered", "not_found");
    }

    // Idempotent: same tx already recorded -> success
    const existing = await prisma.crawlEvent.findUnique({ where: { txHash } });
    if (existing) {
      res.json({ ok: true, idempotent: true });
      return;
    }

    const receipt = await getCrawlReceipt(txHash);
    if (!receipt) {
      throw new AppError(400, "Transaction not found or not a CrawlPaid", "bad_receipt");
    }
    if (receipt.siteId.toLowerCase() !== siteId.toLowerCase()) {
      throw new AppError(400, "Receipt siteId mismatch", "site_mismatch");
    }
    if (receipt.nonce.toLowerCase() !== nonce.toLowerCase()) {
      throw new AppError(400, "Receipt nonce mismatch", "nonce_mismatch");
    }
    if (receipt.amount < site.priceMicros) {
      throw new AppError(400, "Underpayment", "underpaid");
    }

    await prisma.crawlEvent.create({
      data: {
        siteId: site.id,
        agentAddress: receipt.agent.toLowerCase(),
        amountMicros: receipt.amount,
        publisherCut: receipt.publisherCut,
        protocolCut: receipt.protocolCut,
        txHash: receipt.txHash,
        nonce: receipt.nonce,
        userAgent: userAgent ?? null,
        path: reqPath ?? null,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
