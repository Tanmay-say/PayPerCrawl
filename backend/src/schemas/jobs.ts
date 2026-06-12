import { z } from "zod";

const amountString = z.string().regex(/^\d+$/);

export const createJobSchema = z.object({
  targetUrl: z.string().url(),
  outputFormat: z.enum([
    "RAW_HTML",
    "RENDERED_HTML",
    "TEXT",
    "JSON",
    "SCREENSHOT",
    "PDF",
  ]),
  maxFee: amountString,
  tip: amountString.optional().default("0"),
  verificationMode: z.enum(["OPTIMISTIC", "ZKTLS"]).default("OPTIMISTIC"),
});

export const submitResultSchema = z.object({
  resultHash: z.string().min(1),
  resultPointer: z.string().min(1),
  statusCode: z.number().int().min(100).max(599),
});
