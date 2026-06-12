import { z } from "zod";

const txHash = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
const bytes32 = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

export const registerSiteSchema = z.object({
  /** On-chain siteId returned by computeSiteId / SiteRegistered log. */
  onchainId: bytes32,
  domain: z.string().min(3).max(253).regex(/^[a-z0-9.-]+$/i),
  priceMicros: z.string().regex(/^\d+$/),
  /** Tx that called registerSite — verified server-side. */
  txHash,
});

export const updatePriceSchema = z.object({
  priceMicros: z.string().regex(/^\d+$/),
});

export const verifyCrawlSchema = z.object({
  siteId: bytes32,
  nonce: bytes32,
  txHash,
  userAgent: z.string().max(512).optional(),
  path: z.string().max(2048).optional(),
});
