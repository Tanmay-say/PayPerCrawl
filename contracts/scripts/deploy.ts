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
  const publisherBps = Number(process.env.PUBLISHER_SHARE_BPS ?? 7000);
  const workerBps = Number(process.env.WORKER_SHARE_BPS ?? 2500);
  const protocolBps = Number(process.env.PROTOCOL_FEE_BPS ?? 500);

  if (publisherBps + workerBps + protocolBps !== 10_000) {
    throw new Error("PUBLISHER_SHARE_BPS + WORKER_SHARE_BPS + PROTOCOL_FEE_BPS must equal 10000");
  }

  const settlerAddress = (process.env.SETTLER_ADDRESS ?? deployer.account.address) as `0x${string}`;

  console.log("Deployer:", deployer.account.address);
  console.log("USDC:", usdcAddress);
  console.log("Settler:", settlerAddress);

  const treasury = await hre.viem.deployContract("PayPerCrawlTreasury", [
    usdcAddress,
    deployer.account.address,
  ]);
  console.log("PayPerCrawlTreasury:", treasury.address);

  const escrow = await hre.viem.deployContract("PayPerCrawlEscrow", [
    usdcAddress,
    treasury.address,
    settlerAddress,
    publisherBps,
    workerBps,
    protocolBps,
  ]);
  console.log("PayPerCrawlEscrow:", escrow.address);

  const challengerRewardBps = 2000;
  const workerStake = await hre.viem.deployContract("WorkerStake", [
    usdcAddress,
    treasury.address,
    settlerAddress,
    challengerRewardBps,
  ]);
  console.log("WorkerStake:", workerStake.address);

  const networkName = hre.network.name;
  const deployment = {
    network: networkName,
    chainId,
    usdc: getAddress(usdcAddress),
    treasury: getAddress(treasury.address),
    escrow: getAddress(escrow.address),
    workerStake: getAddress(workerStake.address),
    settler: getAddress(settlerAddress),
    splitBps: {
      publisher: publisherBps,
      worker: workerBps,
      protocol: protocolBps,
      challengerSlash: challengerRewardBps,
    },
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
