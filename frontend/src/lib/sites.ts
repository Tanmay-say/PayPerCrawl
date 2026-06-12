import { apiFetch } from "./api";

export interface SiteSummary {
  id: string;
  onchainId: string;
  domain: string;
  priceMicros: string;
  active: boolean;
  createdAt: string;
  crawlCount: number;
}

export interface SiteDetail extends SiteSummary {
  totalEarnedMicros: string;
  contracts: {
    registry: string;
    escrow: string;
    usdc: string;
    chainId: number;
    protocolFeeBps: number;
  };
}

export interface CrawlEvent {
  id: string;
  agentAddress: string;
  amountMicros: string;
  publisherCut: string;
  protocolCut: string;
  txHash: string;
  nonce: string;
  userAgent: string | null;
  path: string | null;
  createdAt: string;
}

export interface SiteSnippet {
  siteId: string;
  domain: string;
  priceMicros: string;
  apiBase: string;
  escrow: string;
  registry: string;
  usdc: string;
  chainId: number;
  chain: string;
  metaTag: string;
}

export async function listSites(): Promise<SiteSummary[]> {
  return apiFetch<SiteSummary[]>("/api/sites");
}

export async function getSite(id: string): Promise<SiteDetail> {
  return apiFetch<SiteDetail>(`/api/sites/${id}`);
}

export async function getSnippet(id: string): Promise<SiteSnippet> {
  return apiFetch<SiteSnippet>(`/api/sites/${id}/snippet`);
}

export async function listEvents(id: string): Promise<CrawlEvent[]> {
  return apiFetch<CrawlEvent[]>(`/api/sites/${id}/events`);
}

export async function registerSiteOnApi(input: {
  onchainId: string;
  domain: string;
  priceMicros: string;
  txHash: string;
}): Promise<SiteSummary> {
  return apiFetch<SiteSummary>("/api/sites", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function microsToUsdc(micros: string | bigint): string {
  const n = typeof micros === "string" ? BigInt(micros) : micros;
  const whole = n / 1_000_000n;
  const frac = (n % 1_000_000n).toString().padStart(6, "0");
  const trimmed = frac.replace(/0+$/, "");
  return trimmed.length > 0 ? `${whole}.${trimmed}` : whole.toString();
}

export function usdcToMicros(value: string): bigint {
  const [whole, frac = ""] = value.split(".");
  const padded = (frac + "000000").slice(0, 6);
  return BigInt(whole || "0") * 1_000_000n + BigInt(padded || "0");
}
