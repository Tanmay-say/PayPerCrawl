import deployment from "../../../contracts/deployments/base-sepolia.json";

export const CHAIN_ID = deployment.chainId;
export const REGISTRY_ADDRESS = deployment.registry as `0x${string}`;
export const ESCROW_ADDRESS = deployment.escrow as `0x${string}`;
export const USDC_ADDRESS = deployment.usdc as `0x${string}`;
export const TREASURY_ADDRESS = deployment.treasury as `0x${string}`;
export const PROTOCOL_FEE_BPS = deployment.protocolFeeBps;

export const REGISTRY_ABI = [
  {
    type: "function",
    name: "registerSite",
    stateMutability: "nonpayable",
    inputs: [
      { name: "domain", type: "string" },
      { name: "priceMicros", type: "uint256" },
    ],
    outputs: [{ name: "siteId", type: "bytes32" }],
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
  {
    type: "function",
    name: "updatePrice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "siteId", type: "bytes32" },
      { name: "newPriceMicros", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "siteId", type: "bytes32" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
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
    type: "event",
    name: "SiteRegistered",
    inputs: [
      { name: "siteId", type: "bytes32", indexed: true },
      { name: "publisher", type: "address", indexed: true },
      { name: "domain", type: "string", indexed: false },
      { name: "priceMicros", type: "uint256", indexed: false },
    ],
  },
] as const;
