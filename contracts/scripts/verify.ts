import * as fs from "node:fs";
import * as path from "node:path";
import hre from "hardhat";

interface DeploymentArtifact {
  network: string;
  chainId: number;
  usdc: string;
  treasury: string;
  escrow: string;
  workerStake: string;
  settler: string;
  splitBps: {
    publisher: number;
    worker: number;
    protocol: number;
    challengerSlash: number;
  };
}

async function main() {
  const artifactPath = path.join(__dirname, "..", "deployments", "base-sepolia.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Missing ${artifactPath} — run deploy:sepolia first`);
  }

  const deployment = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as DeploymentArtifact;
  const [deployer] = await hre.viem.getWalletClients();

  console.log("Verifying on", deployment.network, "chainId", deployment.chainId);

  await hre.run("verify:verify", {
    address: deployment.treasury,
    constructorArguments: [deployment.usdc, deployer.account.address],
  });

  await hre.run("verify:verify", {
    address: deployment.escrow,
    constructorArguments: [
      deployment.usdc,
      deployment.treasury,
      deployment.settler,
      deployment.splitBps.publisher,
      deployment.splitBps.worker,
      deployment.splitBps.protocol,
    ],
  });

  await hre.run("verify:verify", {
    address: deployment.workerStake,
    constructorArguments: [
      deployment.usdc,
      deployment.treasury,
      deployment.settler,
      deployment.splitBps.challengerSlash,
    ],
  });

  console.log("Verification submitted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
