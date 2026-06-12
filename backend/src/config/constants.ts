/** Micro-USDC base units (6 decimal places). */
export const MICRO_USDC_DECIMALS = 6;

/** Default crawl price: $0.001 = 1000 micro-units. */
export const DEFAULT_PRICE_PER_CRAWL = 1_000n;

export const TREASURY_ACCOUNT_ID = "treasury";

export function userAccountId(userId: string): string {
  return `user:${userId}`;
}

export function escrowAccountId(jobId: string): string {
  return `escrow:${jobId}`;
}
