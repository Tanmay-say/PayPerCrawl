import { apiFetch } from "./api";
import { CHAIN_ID } from "./contracts";

export interface AuthUser {
  id: string;
  walletAddress: string;
  email: string | null;
}

export async function fetchSiweNonce(walletAddress: string): Promise<string> {
  const res = await apiFetch<{ nonce: string }>("/api/auth/siwe/nonce", {
    method: "POST",
    body: JSON.stringify({ walletAddress }),
  });
  return res.nonce;
}

export function buildSiweMessage(walletAddress: string, nonce: string): string {
  const domain = typeof window !== "undefined" ? window.location.host : "paypercrawl";
  const uri = typeof window !== "undefined" ? window.location.origin : "https://paypercrawl";
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    walletAddress,
    "",
    "Sign in to PayPerCrawl.",
    "",
    `URI: ${uri}`,
    `Version: 1`,
    `Chain ID: ${CHAIN_ID}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
}

export async function siweVerify(
  walletAddress: string,
  signature: string,
  message: string,
  email?: string,
): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/siwe/verify", {
    method: "POST",
    body: JSON.stringify({ walletAddress, signature, message, email }),
  });
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>("/api/me");
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/api/auth/logout", { method: "POST" });
}
