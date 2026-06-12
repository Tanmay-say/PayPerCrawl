import { z } from "zod";

const amountString = z.string().regex(/^\d+$/);

export const registerWorkerSchema = z.object({
  capabilities: z.array(z.string()).min(1),
  minFee: amountString,
});

export const stakeSchema = z.object({
  amount: amountString,
});
