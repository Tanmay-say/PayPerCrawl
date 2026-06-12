import { z } from "zod";

const amountString = z.string().regex(/^\d+$/);

export const registerPublisherSchema = z.object({
  domain: z.string().min(1),
  pricePerCrawl: amountString,
});

export const updatePriceSchema = z.object({
  pricePerCrawl: amountString,
});
