import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const gatewayRouter = Router();

const GATEWAY_WINDOW_MS = 5 * 60 * 1000;

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Publisher drop-in gateway edge — returns 402 for non-payers, 200 for valid crawl tokens. */
gatewayRouter.get("/check", async (req, res) => {
  const domain = String(req.query.domain ?? "").toLowerCase();
  const ts = String(req.query.ts ?? "");
  const sig = String(req.query.sig ?? "");
  const crawlToken = String(req.query.token ?? "");

  if (!domain) {
    res.status(400).json({ error: "missing_domain" });
    return;
  }

  const publisher = await prisma.publisher.findUnique({ where: { domain } });
  if (!publisher) {
    res.status(404).json({ error: "publisher_not_found" });
    return;
  }

  if (crawlToken) {
    const receipt = await prisma.provenanceReceipt.findFirst({
      where: { signature: crawlToken, publisherDomain: domain },
      include: { job: true },
    });
    if (receipt && receipt.job.status === "SETTLED") {
      res.status(200).json({
        status: "paid",
        message: "Crawl authorized",
        receiptId: receipt.id,
      });
      return;
    }
  }

  if (ts && sig) {
    const tsNum = Number(ts);
    if (Number.isFinite(tsNum) && Math.abs(Date.now() - tsNum) <= GATEWAY_WINDOW_MS) {
      const expected = createHmac("sha256", publisher.gateSecret)
        .update(`${domain}:${ts}`)
        .digest("hex");
      if (safeEqual(sig, expected)) {
        res.status(402).json({
          status: "payment_required",
          pricePerCrawl: publisher.pricePerCrawl.toString(),
          currency: "USDC",
          chain: "base",
          contract: "PayPerCrawlEscrow",
          message: "HTTP 402 — pay per crawl to access content",
        });
        return;
      }
    }
  }

  res.status(402).json({
    status: "payment_required",
    pricePerCrawl: publisher.pricePerCrawl.toString(),
    currency: "USDC",
    chain: "base",
    message: "Sign request with gateSecret HMAC or present a valid crawl token",
  });
});
