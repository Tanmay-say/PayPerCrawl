import * as fs from "node:fs";
import * as path from "node:path";
import hre from "hardhat";
import { getAddress } from "viem";

const DEFAULT_USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();

  const usdcAddress = (process.env.USDC_ADDRESS ?? DEFAULT_USDC_BASE_SEPOLIA) as `0x${string}`;
  const protocolBps = Number(process.env.PROTOCOL_FEE_BPS ?? 1000);
  if (protocolBps <= 0 || protocolBps >= 10_000) {
    throw new Error("PROTOCOL_FEE_BPS must be between 1 and 9999 (e.g. 1000 = 10%)");
  }

  console.log("Deployer:", deployer.account.address);
  console.log("USDC:", usdcAddress);
  console.log("Protocol fee bps:", protocolBps);

  const treasury = await hre.viem.deployContract("PayPerCrawlTreasury", [
    usdcAddress,
    deployer.account.address,
  ]);
  console.log("PayPerCrawlTreasury:", treasury.address);

  const registry = await hre.viem.deployContract("PayPerCrawlRegistry", []);
  console.log("PayPerCrawlRegistry:", registry.address);

  const escrow = await hre.viem.deployContract("PayPerCrawlEscrow", [
    usdcAddress,
    registry.address,
    treasury.address,
    protocolBps,
  ]);
  console.log("PayPerCrawlEscrow:", escrow.address);

  const networkName = hre.network.name;
  const deployment = {
    network: networkName,
    chainId,
    usdc: getAddress(usdcAddress),
    treasury: getAddress(treasury.address),
    registry: getAddress(registry.address),
    escrow: getAddress(escrow.address),
    protocolFeeBps: protocolBps,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });

  const outFile =
    networkName === "baseSepolia"
      ? path.join(outDir, "base-sepolia.json")
      : path.join(outDir, `${networkName}.json`);

  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log("Wrote deployment artifact:", outFile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
