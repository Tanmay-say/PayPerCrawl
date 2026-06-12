import { z } from "zod";

/** Amount in micro-USDC base units as string integer. */
const amountString = z.string().regex(/^\d+$/);

export const depositSchema = z.object({
  amount: amountString,
});
