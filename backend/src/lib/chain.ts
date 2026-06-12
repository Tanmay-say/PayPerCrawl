import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  decodeEventLog,
  http,
  keccak256,
  encodeAbiParameters,
} from "viem";
import { baseSepolia } from "viem/chains";
import { env } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Deployment {
  network: string;
  chainId: number;
  usdc: `0x${string}`;
  treasury: `0x${string}`;
  registry: `0x${string}`;
  escrow: `0x${string}`;
  protocolFeeBps: number;
}

function loadDeployment(): Deployment {
  const candidates = [
    path.join(__dirname, "..", "..", "..", "contracts", "deployments", "base-sepolia.json"),
    path.join(__dirname, "..", "..", "deployments", "base-sepolia.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8")) as Deployment;
    }
  }
  throw new Error(
    "contracts/deployments/base-sepolia.json not found. Run `npm run contracts:deploy:sepolia` first.",
  );
}

export const deployment = loadDeployment();

/** Maps an EVM chain id to a short name we send to gateway clients. */
export function chainName(chainId: number = deployment.chainId): string {
  switch (chainId) {
    case 84532:
      return "base-sepolia";
    case 8453:
      return "base";
    default:
      return `chain-${chainId}`;
  }
}

// Use a plain http transport without binding chain so the inferred type stays compact;
// chain context isn't needed for the read-only RPC calls we use.
export const publicClient = createPublicClient({
  transport: http(env.BASE_RPC_URL),
});

// Keep the chain reference exported in case callers want it (e.g. for explorer links).
export { baseSepolia };

export const REGISTRY_ABI = [
  {
    type: "function",
    name: "getSite",
    stateMutability: "view",
    inputs: [{ name: "siteId", type: "bytes32" }],
    outputs: [
      { name: "publisher", type: "address" },
      { name: "priceMicros", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "domain", type: "string" },
    ],
  },
  {
    type: "function",
    name: "computeSiteId",
    stateMutability: "pure",
    inputs: [
      { name: "publisher", type: "address" },
      { name: "domain", type: "string" },
    ],
    outputs: [{ type: "bytes32" }],
  },
] as const;

export const ESCROW_ABI = [
  {
    type: "event",
    name: "CrawlPaid",
    inputs: [
      { name: "siteId", type: "bytes32", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "publisher", type: "address", indexed: true },
      { name: "nonce", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "publisherCut", type: "uint256" },
      { name: "protocolCut", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "isPaid",
    stateMutability: "view",
    inputs: [
      { name: "siteId", type: "bytes32" },
      { name: "nonce", type: "bytes32" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export function computeSiteIdLocal(publisher: `0x${string}`, domain: string): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "string" }],
      [publisher, domain],
    ),
  );
}

export interface CrawlReceipt {
  siteId: `0x${string}`;
  agent: `0x${string}`;
  publisher: `0x${string}`;
  nonce: `0x${string}`;
  amount: bigint;
  publisherCut: bigint;
  protocolCut: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

/** Read a tx receipt and parse the CrawlPaid event from our escrow. */
export async function getCrawlReceipt(txHash: `0x${string}`): Promise<CrawlReceipt | null> {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") return null;
  if (receipt.to?.toLowerCase() !== deployment.escrow.toLowerCase()) return null;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== deployment.escrow.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: ESCROW_ABI,
        data: log.data,
        topics: log.topics,
        eventName: "CrawlPaid",
      });
      const a = decoded.args as unknown as {
        siteId: `0x${string}`;
        agent: `0x${string}`;
        publisher: `0x${string}`;
        nonce: `0x${string}`;
        amount: bigint;
        publisherCut: bigint;
        protocolCut: bigint;
      };
      return {
        ...a,
        blockNumber: receipt.blockNumber,
        txHash,
      };
    } catch {
      /* not the CrawlPaid event */
    }
  }
  return null;
}

export async function readSiteOnchain(siteId: `0x${string}`) {
  const result = await publicClient.readContract({
    address: deployment.registry,
    abi: REGISTRY_ABI,
    functionName: "getSite",
    args: [siteId],
  });
  const [publisher, priceMicros, active, domain] = result as [
    `0x${string}`,
    bigint,
    boolean,
    string,
  ];
  return { publisher, priceMicros, active, domain };
}
